-- Add is_abstinence column to challenge_activities table
ALTER TABLE challenge_activities
ADD COLUMN is_abstinence BOOLEAN DEFAULT FALSE;

-- Mark abstinence activities in the Mental Detox challenge
-- These are the "No" activities where you avoid something
UPDATE challenge_activities
SET is_abstinence = TRUE
WHERE title IN (
  'No Social Media',
  'No Long-Form Content',
  'Detox Compliance'
);

-- Add comment
COMMENT ON COLUMN challenge_activities.is_abstinence IS 'TRUE for avoidance activities (No Social Media, No Alcohol), FALSE for active tasks (Exercise, Meditation).';

-- Create index for querying abstinence activities
CREATE INDEX idx_challenge_activities_abstinence ON challenge_activities(challenge_id, is_abstinence) WHERE is_abstinence = true;
