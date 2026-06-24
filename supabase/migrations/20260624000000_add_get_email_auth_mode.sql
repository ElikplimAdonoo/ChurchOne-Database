-- Create get_email_auth_mode function to check if a user is required to sign in with Google
CREATE OR REPLACE FUNCTION public.get_email_auth_mode(input_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_verified BOOLEAN;
BEGIN
    -- Only match on personal_email (Gmail).
    -- ChurchOne @churchone.com emails always use password auth and should never match here.
    SELECT email_verified INTO v_verified
    FROM public.people
    WHERE personal_email ILIKE LOWER(TRIM(input_email))
    LIMIT 1;

    -- Only return 'google' if the personal email is verified
    IF v_verified = TRUE THEN
        RETURN 'google';
    ELSE
        RETURN 'password';
    END IF;
END;
$$;

-- Grant execute permissions to public/anonymous users (so they can call it before logging in)
GRANT EXECUTE ON FUNCTION public.get_email_auth_mode(TEXT) TO anon, authenticated;
