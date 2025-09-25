import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Search, 
  MapPin, 
  Building, 
  Users, 
  TrendingUp,
  LogOut,
  User,
  Settings
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  percentile: number | null;
  category: string | null;
  domicile: string | null;
}

interface CollegePrediction {
  college_name: string;
  college_code: string;
  location: string;
  type: string;
  branch_name: string;
  degree_type: string;
  closing_percentile: number;
  probability: 'High' | 'Medium' | 'Low';
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<CollegePrediction[]>([]);
  
  const [searchData, setSearchData] = useState({
    percentile: '',
    category: '',
    domicile: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
      if (data.percentile && data.category && data.domicile) {
        setSearchData({
          percentile: data.percentile.toString(),
          category: data.category,
          domicile: data.domicile
        });
      }
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        percentile: parseFloat(searchData.percentile),
        category: searchData.category,
        domicile: searchData.domicile
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } else {
      fetchProfile();
    }
  };

  const searchColleges = async () => {
    if (!searchData.percentile || !searchData.category || !searchData.domicile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to search for colleges.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    await updateProfile();

    // Mock prediction logic - in a real app, this would be more sophisticated
    const mockPredictions: CollegePrediction[] = [
      {
        college_name: "Veermata Jijabai Technological Institute",
        college_code: "VJTI",
        location: "Mumbai",
        type: "Government",
        branch_name: "Computer Engineering",
        degree_type: "BE",
        closing_percentile: 95.2,
        probability: parseFloat(searchData.percentile) >= 95.2 ? 'High' : 
                    parseFloat(searchData.percentile) >= 93.0 ? 'Medium' : 'Low'
      },
      {
        college_name: "Government College of Engineering Pune",
        college_code: "COEP",
        location: "Pune",
        type: "Government",
        branch_name: "Information Technology",
        degree_type: "BE",
        closing_percentile: 94.8,
        probability: parseFloat(searchData.percentile) >= 94.8 ? 'High' : 
                    parseFloat(searchData.percentile) >= 92.5 ? 'Medium' : 'Low'
      },
      {
        college_name: "Sardar Patel Institute of Technology",
        college_code: "SPIT",
        location: "Mumbai",
        type: "Private",
        branch_name: "Computer Engineering",
        degree_type: "BE",
        closing_percentile: 92.5,
        probability: parseFloat(searchData.percentile) >= 92.5 ? 'High' : 
                    parseFloat(searchData.percentile) >= 90.0 ? 'Medium' : 'Low'
      }
    ];

    // Filter predictions based on percentile
    const filteredPredictions = mockPredictions.filter(
      pred => parseFloat(searchData.percentile) >= pred.closing_percentile - 5
    );

    setPredictions(filteredPredictions);

    // Save prediction to database
    await supabase
      .from('user_predictions')
      .insert({
        user_id: user?.id,
        percentile: parseFloat(searchData.percentile),
        category: searchData.category,
        domicile: searchData.domicile,
        predicted_colleges: filteredPredictions as any
      });

    setLoading(false);

    toast({
      title: "Search Complete",
      description: `Found ${filteredPredictions.length} matching colleges for your profile.`
    });
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'High': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out."
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MHT-CET Planner</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center space-x-2">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <Card className="shadow-card border-0 bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-primary" />
                  <span>Find Your Colleges</span>
                </CardTitle>
                <CardDescription>
                  Enter your MHT-CET details to get personalized college recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="percentile">MHT-CET Percentile</Label>
                  <Input
                    id="percentile"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="Enter your percentile"
                    value={searchData.percentile}
                    onChange={(e) => setSearchData({ ...searchData, percentile: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={searchData.category} onValueChange={(value) => setSearchData({ ...searchData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="OBC">OBC</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="ST">ST</SelectItem>
                      <SelectItem value="EWS">EWS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domicile">Domicile</Label>
                  <Select value={searchData.domicile} onValueChange={(value) => setSearchData({ ...searchData, domicile: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your domicile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Outside Maharashtra">Outside Maharashtra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={searchColleges} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300"
                >
                  {loading ? 'Searching...' : 'Search Colleges'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">College Recommendations</h2>
                <p className="text-muted-foreground">
                  Based on your MHT-CET percentile and preferences
                </p>
              </div>

              {predictions.length === 0 ? (
                <Card className="shadow-card border-0 bg-card/95 backdrop-blur-sm">
                  <CardContent className="py-12 text-center">
                    <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Predictions Yet</h3>
                    <p className="text-muted-foreground">
                      Fill in your details and click "Search Colleges" to get personalized recommendations.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {predictions.map((prediction, index) => (
                    <Card key={index} className="shadow-card border-0 bg-card/95 backdrop-blur-sm hover:shadow-elegant transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-card-foreground">
                              {prediction.college_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {prediction.college_code} • {prediction.branch_name} ({prediction.degree_type})
                            </p>
                          </div>
                          <Badge className={getProbabilityColor(prediction.probability)}>
                            {prediction.probability} Chance
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{prediction.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span>{prediction.type}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span>Cutoff: {prediction.closing_percentile}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>Your: {searchData.percentile}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;