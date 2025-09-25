-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  percentile DECIMAL(5,2),
  category TEXT CHECK (category IN ('OPEN', 'OBC', 'SC', 'ST', 'EWS')),
  domicile TEXT CHECK (domicile IN ('Maharashtra', 'Outside Maharashtra')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colleges table
CREATE TABLE public.colleges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_name TEXT NOT NULL,
  college_code TEXT UNIQUE NOT NULL,
  location TEXT NOT NULL,
  type TEXT CHECK (type IN ('Government', 'Private', 'University Department')),
  autonomy_status TEXT CHECK (autonomy_status IN ('Autonomous', 'Non-Autonomous')),
  university_name TEXT,
  established_year INTEGER,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 4,
  degree_type TEXT CHECK (degree_type IN ('BE', 'BTech', 'BSc', 'BArch', 'BPharma')) NOT NULL DEFAULT 'BE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_name, degree_type)
);

-- Create college branches junction table
CREATE TABLE public.college_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  intake_capacity INTEGER,
  fees_per_year DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(college_id, branch_id)
);

-- Create cutoffs table for historical data
CREATE TABLE public.cutoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_branch_id UUID NOT NULL REFERENCES public.college_branches(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  round_number INTEGER NOT NULL CHECK (round_number IN (1, 2, 3)),
  category TEXT NOT NULL CHECK (category IN ('OPEN', 'OBC', 'SC', 'ST', 'EWS')),
  domicile TEXT NOT NULL CHECK (domicile IN ('Maharashtra', 'Outside Maharashtra')),
  gender TEXT CHECK (gender IN ('Male', 'Female', 'All')) DEFAULT 'All',
  opening_percentile DECIMAL(5,2) NOT NULL,
  closing_percentile DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(college_branch_id, year, round_number, category, domicile, gender)
);

-- Create user predictions/history table
CREATE TABLE public.user_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentile DECIMAL(5,2) NOT NULL,
  category TEXT NOT NULL,
  domicile TEXT NOT NULL,
  predicted_colleges JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for public data (colleges, branches, cutoffs)
CREATE POLICY "Anyone can view colleges" ON public.colleges
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view branches" ON public.branches
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view college branches" ON public.college_branches
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view cutoffs" ON public.cutoffs
  FOR SELECT USING (true);

-- Create RLS policies for user predictions
CREATE POLICY "Users can view their own predictions" ON public.user_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions" ON public.user_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for branches
INSERT INTO public.branches (branch_name, branch_code, degree_type) VALUES
('Computer Engineering', 'CO', 'BE'),
('Information Technology', 'IT', 'BE'),
('Electronics & Telecommunication', 'EXTC', 'BE'),
('Mechanical Engineering', 'MECH', 'BE'),
('Civil Engineering', 'CIVIL', 'BE'),
('Chemical Engineering', 'CHEM', 'BE'),
('Electrical Engineering', 'ELEC', 'BE'),
('Production Engineering', 'PROD', 'BE'),
('Instrumentation Engineering', 'INST', 'BE'),
('Biomedical Engineering', 'BIOMED', 'BE'),
('Textile Engineering', 'TEXT', 'BE'),
('Mining Engineering', 'MINING', 'BE'),
('Metallurgical Engineering', 'METAL', 'BE'),
('Architecture', 'ARCH', 'BArch'),
('Pharmacy', 'PHARMA', 'BPharma');

-- Insert sample colleges
INSERT INTO public.colleges (college_name, college_code, location, type, autonomy_status, university_name, established_year) VALUES
('Veermata Jijabai Technological Institute', 'VJTI', 'Mumbai', 'Government', 'Autonomous', 'University of Mumbai', 1887),
('Government College of Engineering Pune', 'COEP', 'Pune', 'Government', 'Autonomous', 'University of Pune', 1854),
('Sardar Patel Institute of Technology', 'SPIT', 'Mumbai', 'Private', 'Autonomous', 'University of Mumbai', 1962),
('K J Somaiya College of Engineering', 'KJSCE', 'Mumbai', 'Private', 'Autonomous', 'University of Mumbai', 1983),
('Thadomal Shahani Engineering College', 'TSEC', 'Mumbai', 'Private', 'Non-Autonomous', 'University of Mumbai', 1983),
('Ramrao Adik Institute of Technology', 'RAIT', 'Navi Mumbai', 'Private', 'Autonomous', 'University of Mumbai', 1998),
('Bharati Vidyapeeth College of Engineering', 'BVCOE', 'Pune', 'Private', 'Autonomous', 'Bharati Vidyapeeth University', 1983),
('MIT College of Engineering', 'MITCOE', 'Pune', 'Private', 'Autonomous', 'MIT University', 1983),
('Vishwakarma Institute of Technology', 'VIT', 'Pune', 'Private', 'Autonomous', 'University of Pune', 1983),
('Walchand College of Engineering', 'WCE', 'Sangli', 'Government', 'Autonomous', 'Shivaji University', 1947);