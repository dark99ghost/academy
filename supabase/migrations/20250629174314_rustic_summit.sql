/*
  # Fix missing role column in user_profiles table

  This migration ensures the role column exists in the user_profiles table
  and sets up the necessary policies and functions.

  1. Tables
    - Add role column to user_profiles if it doesn't exist
    - Set default role as 'student'
    - Update existing admin users

  2. Security
    - Update RLS policies for new role system
    - Create functions for role management

  3. Views
    - Create user_profiles_with_courses view for admin dashboard
*/

-- Add role column to user_profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin'));
    
    -- Update existing admin users
    UPDATE user_profiles SET role = 'admin' WHERE is_admin = true;
    
    -- Create index on role column
    CREATE INDEX idx_user_profiles_role ON user_profiles(role);
  END IF;
END $$;

-- Update RLS policies for role-based access
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins and instructors can read all profiles" ON user_profiles;

CREATE POLICY "Admins and instructors can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- Update course policies
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Admins and instructors can manage courses" ON courses;

CREATE POLICY "Admins and instructors can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- Update lecture policies
DROP POLICY IF EXISTS "Admins can manage lectures" ON lectures;
DROP POLICY IF EXISTS "Admins and instructors can manage lectures" ON lectures;

CREATE POLICY "Admins and instructors can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- Update lecture materials policies
DROP POLICY IF EXISTS "Admins can manage lecture materials" ON lecture_materials;
DROP POLICY IF EXISTS "Admins and instructors can manage lecture materials" ON lecture_materials;

CREATE POLICY "Admins and instructors can manage lecture materials"
  ON lecture_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

-- Update subscription codes policies
DROP POLICY IF EXISTS "Admins can manage subscription codes" ON subscription_codes;

CREATE POLICY "Admins can manage subscription codes"
  ON subscription_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update user course access policies
DROP POLICY IF EXISTS "Admins can read all course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins can manage course access" ON user_course_access;
DROP POLICY IF EXISTS "Admins and instructors can read all course access" ON user_course_access;

CREATE POLICY "Admins and instructors can read all course access"
  ON user_course_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admins can manage course access"
  ON user_course_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id uuid,
  new_role text
) RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: You must be an admin to change roles';
  END IF;
  
  -- Validate new role
  IF new_role NOT IN ('student', 'instructor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: Must be student, instructor, or admin';
  END IF;
  
  -- Update role
  UPDATE user_profiles
  SET role = new_role,
      is_admin = (new_role = 'admin'),
      updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete subscription code (admin only)
CREATE OR REPLACE FUNCTION delete_subscription_code(code_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE user_id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: You must be an admin to delete codes';
  END IF;
  
  -- Delete the code
  DELETE FROM subscription_codes WHERE id = code_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for users with course information
DROP VIEW IF EXISTS user_profiles_with_courses;

CREATE VIEW user_profiles_with_courses AS
SELECT 
  up.*,
  COUNT(DISTINCT uca.course_id) as enrolled_courses_count,
  ARRAY_AGG(
    DISTINCT jsonb_build_object(
      'course_id', c.id,
      'course_title', c.title,
      'expires_at', uca.expires_at,
      'is_active', uca.is_active
    )
  ) FILTER (WHERE c.id IS NOT NULL) as enrolled_courses
FROM user_profiles up
LEFT JOIN user_course_access uca ON up.user_id = uca.user_id
LEFT JOIN courses c ON uca.course_id = c.id
GROUP BY up.id, up.user_id, up.full_name, up.avatar_url, up.education_level, up.role, up.is_admin, up.created_at, up.updated_at;

-- Grant permissions to the view
GRANT SELECT ON user_profiles_with_courses TO authenticated;

-- Create RLS policy for the view
DROP POLICY IF EXISTS "Admins can view user profiles with courses" ON user_profiles_with_courses;

CREATE POLICY "Admins can view user profiles with courses"
  ON user_profiles_with_courses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );