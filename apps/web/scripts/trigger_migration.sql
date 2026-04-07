CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.profiles (id, owner_id, username, display_name, avatar_url, school_id)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.raw_user_meta_data->>'school_id' IS NOT NULL AND NEW.raw_user_meta_data->>'school_id' != ''
      THEN (NEW.raw_user_meta_data->>'school_id')::UUID
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$fn$;
