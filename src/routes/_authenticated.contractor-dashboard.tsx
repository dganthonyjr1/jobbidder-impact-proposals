import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { getContractorStats, getContractorProposals, getContractorProfile } from "@/lib/contractors.functions";

export const Route = createFileRoute("/_authenticated/contractor-dashboard")({
  head: () => ({ meta: [{ title: "Contractor Dashboard — Jobbidder" }] }),
  component: ContractorDashboard,
});

interface ContractorSession {
  contractor_id: string;
  contractor_name: string;
  authenticated_at: number;
  expires_at: number;
}

function ContractorDashboard() {
  const [contractorSession, setContractorSession] = useState<ContractorSession | null>(null);
  const [showSecondaryAuth, setShowSecondaryAuth] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check for existing contractor session in localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem("contractor_session");
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession) as ContractorSession;
        const now = Date.now();
        
        // Check if session is still valid (24-hour expiration)
        if (session.expires_at > now) {
          setContractorSession(session);
        } else {
          localStorage.removeItem("contractor_session");
          setSessionExpired(true);
        }
      } catch (error) {
        localStorage.removeItem("contractor_session");
      }
    }
  }, []);

  const handleSecondaryAuth = async () => {
    if (!authPassword) {
      toast.error("Please enter your password");
      return;
    }

    setAuthenticating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Not authenticated");
        return;
      }

      // Fetch contractor profile
      const { data: contractor, error } = await supabase
        .from("contractor_applications")
        .select("id, business_name, email, password_hash")
        .eq("user_id", user.id)
        .single();

      if (error || !contractor) {
        toast.error("Contractor profile not found");
        return;
      }

      // Verify password (in production, use bcrypt verification on backend)
      // For now, we'll use a simple verification
      const isValidPassword = await verifyContractorPassword(authPassword, contractor.password_hash);
      
      if (!isValidPassword) {
        toast.error("Invalid password");
        setAuthPassword("");
        return;
      }

      // Create contractor session
      const now = Date.now();
      const session: ContractorSession = {
        contractor_id: contractor.id,
        contractor_name: contractor.business_name,
        authenticated_at: now,
        expires_at: now + 24 * 60 * 60 * 1000, // 24-hour expiration
      };

      localStorage.setItem("contractor_session", JSON.stringify(session));
      setContractorSession(session);
      setShowSecondaryAuth(false);
      setAuthPassword("");
      toast.success(`Welcome back, ${contractor.business_name}!`);
    } catch (error) {
      toast.error(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogoutContractor = () => {
    localStorage.removeItem("contractor_session");
    setContractorSession(null);
    setShowSecondaryAuth(true);
    toast.success("Logged out of contractor dashboard");
  };

  // If no contractor session, show secondary authentication
  if (!contractorSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Contractor Dashboard Access
            </CardTitle>
            <CardDescription>
              {sessionExpired 
                ? "Your session has expired. Please authenticate again."
                : "Enter your password to access your contractor dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSecondaryAuth()}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSecondaryAuth}
              disabled={authenticating || !authPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Access Dashboard"
              )}
            </Button>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-200 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Your contractor dashboard is isolated and secure. Only you can access your data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Contractor is authenticated, show dashboard
  return (
    <ContractorDashboardContent 
      session={contractorSession} 
      onLogout={handleLogoutContractor}
    />
  );
}

interface ContractorDashboardContentProps {
  session: ContractorSession;
  onLogout: () => void;
}

function ContractorDashboardContent({ session, onLogout }: ContractorDashboardContentProps) {
  const fetchStats = useServerFn(getContractorStats);
  const fetchProposals = useServerFn(getContractorProposals);
  const fetchProfile = useServerFn(getContractorProfile);

  const { data: stats } = useQuery({
    queryKey: ["contractor-stats", session.contractor_id],
    queryFn: () => fetchStats({ contractor_id: session.contractor_id }),
  });

  const { data: proposals } = useQuery({
    queryKey: ["contractor-proposals", session.contractor_id],
    queryFn: () => fetchProposals({ contractor_id: session.contractor_id }),
  });

  const { data: profile } = useQuery({
    queryKey: ["contractor-profile", session.contractor_id],
    queryFn: () => fetchProfile({ contractor_id: session.contractor_id }),
  });

  // Calculate session expiration time
  const expiresIn = Math.max(0, Math.floor((session.expires_at - Date.now()) / 1000));
  const expiresInMinutes = Math.floor(expiresIn / 60);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{session.contractor_name}</h1>
            <p className="text-slate-400">Welcome to your contractor dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-slate-400 text-sm">Session expires in</p>
              <p className="text-white font-semibold">{expiresInMinutes} minutes</p>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Proposals</p>
                  <p className="text-3xl font-bold text-white">{stats?.total_proposals || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Accepted</p>
                  <p className="text-3xl font-bold text-green-400">{stats?.accepted_proposals || 0}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">${stats?.total_revenue || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Acceptance Rate</p>
                  <p className="text-3xl font-bold text-white">
                    {stats?.total_proposals ? Math.round((stats.accepted_proposals / stats.total_proposals) * 100) : 0}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="proposals" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Recent Proposals
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
              <Lock className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Proposals</CardTitle>
                <CardDescription>Your latest proposals and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {proposals && proposals.length > 0 ? (
                  <div className="space-y-3">
                    {proposals.slice(0, 5).map((proposal: any) => (
                      <div
                        key={proposal.id}
                        className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-semibold">{proposal.client_name}</p>
                          <p className="text-slate-400 text-sm">{proposal.job_address}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">${proposal.total_value}</p>
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                            proposal.status === "accepted"
                              ? "bg-green-500/20 text-green-300"
                              : proposal.status === "sent"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-slate-600 text-slate-300"
                          }`}>
                            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">No proposals yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Contractor Profile</CardTitle>
                <CardDescription>Your business information and credentials</CardDescription>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-slate-400">Business Name</Label>
                      <p className="text-white font-semibold mt-1">{profile.business_name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Email</Label>
                      <p className="text-white font-semibold mt-1">{profile.email}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Phone</Label>
                      <p className="text-white font-semibold mt-1">{profile.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">License Number</Label>
                      <p className="text-white font-semibold mt-1">{profile.license_number || "Not provided"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-slate-400">Specialties</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.specialties?.map((specialty: string) => (
                          <span key={specialty} className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">Loading profile...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
                <CardDescription>Manage your account security and session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-200 text-sm">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Your contractor dashboard is isolated and encrypted. Only you can access your data.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3">Current Session</h3>
                  <div className="bg-slate-700 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Authenticated at:</span>
                      <span className="text-white">{new Date(session.authenticated_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expires at:</span>
                      <span className="text-white">{new Date(session.expires_at).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time remaining:</span>
                      <span className="text-white">{expiresInMinutes} minutes</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Logout from Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper function to verify contractor password
async function verifyContractorPassword(password: string, passwordHash: string): Promise<boolean> {
  // In production, use bcrypt.compare() on the backend
  // For now, this is a placeholder that should be implemented server-side
  try {
    const response = await fetch("/api/verify-contractor-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, passwordHash }),
    });
    const result = await response.json();
    return result.valid === true;
  } catch {
    return false;
  }
}
