-- This migration has been disabled to resolve signup conflicts
-- The application uses a custom user_profiles table instead of the default profiles table

/*
  Migration disabled due to conflict with existing user_profiles table.
  This migration was creating a redundant profiles table and trigger
  that interfered with the application's signup process.
*/