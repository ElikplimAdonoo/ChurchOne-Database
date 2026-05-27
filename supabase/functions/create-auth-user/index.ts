/// <reference types="https://deno.land/x/deno/cli/types/dts/lib.deno.ns.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? ""

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const {
      fullName,
      personalEmail,
      unitId,
      positionId,
    } = await req.json()

    // Validate required field
    if (!fullName) {
      return new Response(
        JSON.stringify({
          error: "Missing fullName",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      )
    }

    // Generate church email
    const names = fullName.trim().split(" ")

    const firstName =
      names[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "member"

    const lastName =
      names.length > 1
        ? names[names.length - 1]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
        : "member"

    const baseEmail = `${firstName}.${lastName}@churchone.com`

    // Ensure email uniqueness
    let generatedEmail = baseEmail
    let counter = 1

    while (true) {
      const { data } = await supabaseClient
        .from("people")
        .select("id")
        .eq("email", generatedEmail)
        .maybeSingle()

      if (data) {
        generatedEmail = `${firstName}.${lastName}${counter}@churchone.com`
        counter++
      } else {
        break
      }
    }

    // Default password
    const password = "aTTendance.0123"

    let authUserId = null;

    // Create auth user
    const {
      data: authData,
      error: authError,
    } = await supabaseClient.auth.admin.createUser({
      email: generatedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      // If user already exists, fetch their ID instead of failing
      if (authError.message.includes("already registered") || authError.status === 422) {
        const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === generatedEmail);
        
        if (existingUser) {
           authUserId = existingUser.id;
        } else {
           throw new Error(`Failed to create or find auth user: ${authError.message}`)
        }
      } else {
        throw new Error(
          `Failed to create auth user: ${authError.message}`
        )
      }
    } else if (authData.user) {
       authUserId = authData.user.id
    }

    if (!authUserId) {
      throw new Error("User creation failed or ID not found")
    }

    // ─── INTELLIGENT PROFILE LINKING ───
    // Search for an existing profile with the same name that has no auth_user_id yet
    const { data: existingProfiles } = await supabaseClient
      .from("people")
      .select("id, full_name")
      .ilike("full_name", fullName)
      .is("auth_user_id", null)

    let person = null
    let linkedExisting = false

    if (existingProfiles && existingProfiles.length === 1) {
      // Exactly one unlinked profile found — safe to link
      const { data: updated, error: updateError } = await supabaseClient
        .from("people")
        .update({
          auth_user_id: authUserId,
          email: generatedEmail,
          personal_email: personalEmail || null,
          is_placeholder: false,
        })
        .eq("id", existingProfiles[0].id)
        .select()
        .single()

      if (updateError) {
        await supabaseClient.auth.admin.deleteUser(authUserId)
        throw new Error(
          `Failed to link existing profile: ${updateError.message}`
        )
      }
      person = updated
      linkedExisting = true
    } else if (existingProfiles && existingProfiles.length > 1) {
      // Multiple unlinked profiles with same name — try to disambiguate by unit
      let matchedProfile = null

      if (unitId) {
        // Check which of these people has a position_assignment in the target unit
        for (const profile of existingProfiles) {
          const { data: assignment } = await supabaseClient
            .from("position_assignments")
            .select("id")
            .eq("person_id", profile.id)
            .eq("unit_id", unitId)
            .eq("is_active", true)
            .maybeSingle()

          if (assignment) {
            matchedProfile = profile
            break
          }
        }
      }

      if (matchedProfile) {
        // Found a match by unit — link it
        const { data: updated, error: updateError } = await supabaseClient
          .from("people")
          .update({
            auth_user_id: authUserId,
            email: generatedEmail,
            personal_email: personalEmail || null,
            is_placeholder: false,
          })
          .eq("id", matchedProfile.id)
          .select()
          .single()

        if (updateError) {
          await supabaseClient.auth.admin.deleteUser(authUserId)
          throw new Error(
            `Failed to link existing profile: ${updateError.message}`
          )
        }
        person = updated
        linkedExisting = true
      }
      // If no match by unit, fall through to create a new profile below
    }

    // If no existing profile was linked, create a new one
    if (!person) {
      const {
        data: newPerson,
        error: personError,
      } = await supabaseClient
        .from("people")
        .insert([
          {
            full_name: fullName,
            email: generatedEmail,
            personal_email: personalEmail || null,
            auth_user_id: authUserId,
            is_placeholder: false,
          },
        ])
        .select()
        .single()

      if (personError) {
        // Cleanup auth user if database insert fails
        await supabaseClient.auth.admin.deleteUser(authUserId)

        throw new Error(
          `Auth user created but failed to insert person: ${personError.message}`
        )
      }
      person = newPerson
    }

    // Assign position if provided (only for newly created profiles, not linked ones)
    if (unitId && positionId && !linkedExisting) {
      const { error: assignError } = await supabaseClient
        .from("position_assignments")
        .insert([
          {
            person_id: person.id,
            unit_id: unitId,
            position_id: positionId,
            is_active: true,
            is_primary: true,
          },
        ])

      if (assignError) {
        console.error("Assignment failed:", assignError)

        return new Response(
          JSON.stringify({
            person,
            warning:
              "Person created but position assignment failed.",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          }
        )
      }
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        person,
        linkedExisting,
        login: {
          email: generatedEmail,
          password,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    )
  }
})