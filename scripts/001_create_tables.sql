-- Department Screen System Schema - Tables Only

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('frail', 'nursing', 'dementia', 'rehab', 'assisted_living')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screen settings table
CREATE TABLE IF NOT EXISTS screen_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  layout_type TEXT NOT NULL DEFAULT 'default' CHECK (layout_type IN ('default', 'dementia_simple', 'lobby')),
  font_scale DECIMAL(3,2) DEFAULT 1.0,
  show_calendar BOOLEAN DEFAULT TRUE,
  show_announcements BOOLEAN DEFAULT TRUE,
  show_ticker BOOLEAN DEFAULT TRUE,
  idle_message TEXT DEFAULT 'ברוכים הבאים ויום נעים',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('exercise', 'music', 'cognitive', 'art', 'social', 'news', 'meal', 'therapy', 'free_time')),
  location TEXT,
  instructor_name TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'cancelled', 'completed')),
  color_tag TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_fullscreen BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticker messages table
CREATE TABLE IF NOT EXISTS ticker_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticker_messages ENABLE ROW LEVEL SECURITY;

-- Public read policies for display screens
CREATE POLICY "departments_select_all" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_all_access" ON departments FOR ALL USING (true);
CREATE POLICY "screen_settings_select_all" ON screen_settings FOR SELECT USING (true);
CREATE POLICY "screen_settings_all_access" ON screen_settings FOR ALL USING (true);
CREATE POLICY "activities_select_all" ON activities FOR SELECT USING (true);
CREATE POLICY "activities_all_access" ON activities FOR ALL USING (true);
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_all_access" ON announcements FOR ALL USING (true);
CREATE POLICY "ticker_select_all" ON ticker_messages FOR SELECT USING (true);
CREATE POLICY "ticker_all_access" ON ticker_messages FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activities_department ON activities(department_id);
CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_datetime);
CREATE INDEX IF NOT EXISTS idx_announcements_department ON announcements(department_id);
