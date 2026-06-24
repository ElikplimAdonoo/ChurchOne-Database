-- Create get_email_auth_mode function to check if a user is required to sign in with Google
CREATE OR REPLACE FUNCTION public.get_email_auth_mode(input_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_verified BOOLEAN;
BEGIN
    -- Look up the email_verified status of the person matching the email or personal_email
    SELECT email_verified INTO v_verified
    FROM public.people
    WHERE email ILIKE LOWER(TRIM(input_email)) OR personal_email ILIKE LOWER(TRIM(input_email))
    LIMIT 1;

    -- If the email belongs to a person who has already linked and verified their personal email,
    -- enforce Google OAuth sign-in.
    IF v_verified = TRUE THEN
        RETURN 'google';
    ELSE
        RETURN 'password';
    END IF;
END;
$$;

-- Grant execute permissions to public/anonymous users (so they can call it before logging in)
GRANT EXECUTE ON FUNCTION public.get_email_auth_mode(TEXT) TO anon, authenticated;
