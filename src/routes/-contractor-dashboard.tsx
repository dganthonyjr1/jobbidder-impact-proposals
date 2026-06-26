/**
 * ============================================================================
 * JOBBIDDER.IO - PROPRIETARY AND CONFIDENTIAL
 * ============================================================================
 * Contractor Dashboard - Lock-in and Engagement Features
 * Protected by U.S. Patent Application (Provisional) - June 23, 2026
 * ============================================================================
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/contractor-dashboard")({
  component: ContractorDashboard,
});

function ContractorDashboard() {
  const [contractor, setContractor] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch contractor profile
      // Fetch performance metrics
      // Fetch projects
      setLoading(false);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Contractor Dashboard</h1>
          <p className="text-slate-600">Manage your profile, projects, and performance</p>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Acceptance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{performance?.acceptance_rate || 0}%</div>
              <p className="text-xs text-slate-500 mt-1">of offers accepted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{performance?.success_rate || 0}%</div>
              <p className="text-xs text-slate-500 mt-1">projects completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{performance?.quality_score || 0}/100</div>
              <p className="text-xs text-slate-500 mt-1">average rating</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Revenue Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">${(performance?.total_revenue_generated || 0).toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">total earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contractor Profile</CardTitle>
                <CardDescription>Your professional information and qualifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Company Name</label>
                    <p className="text-lg font-semibold text-slate-900">{contractor?.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Primary Trade</label>
                    <p className="text-lg font-semibold text-slate-900">{contractor?.trade}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Years in Operation</label>
                    <p className="text-lg font-semibold text-slate-900">{contractor?.years_in_operation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Qualification Status</label>
                    <Badge className={contractor?.qualification_status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {contractor?.qualification_status}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-slate-900 mb-4">NGS Qualification Score</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                          style={{ width: `${(contractor?.qualification_score / 120) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{contractor?.qualification_score}/120</div>
                  </div>
                </div>

                <Button className="w-full">Edit Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>View and manage your assigned projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Projects list would go here */}
                  <p className="text-slate-500">No projects assigned yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Track your performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Performance charts would go here */}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performance?.performance_history || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="success_rate" stroke="#3b82f6" />
                      <Line type="monotone" dataKey="quality_score" stroke="#8b5cf6" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>Upload and manage your professional documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <DocumentUploadItem
                    title="Contractor License"
                    status={contractor?.license_verified ? "verified" : "pending"}
                    expirationDate={contractor?.license_expiration}
                  />
                  <DocumentUploadItem
                    title="General Liability Insurance"
                    status={contractor?.gl_verified ? "verified" : "pending"}
                    expirationDate={contractor?.gl_expiration}
                  />
                  <DocumentUploadItem
                    title="Workers' Compensation Insurance"
                    status={contractor?.wc_verified ? "verified" : "pending"}
                    expirationDate={contractor?.wc_expiration}
                  />
                  <DocumentUploadItem
                    title="Surety Bond"
                    status={contractor?.surety_verified ? "verified" : "pending"}
                    expirationDate={contractor?.surety_expiration}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Email Notifications</label>
                  <p className="text-slate-500 text-sm mt-1">Receive updates about new projects and offers</p>
                  <Button variant="outline" className="mt-2">Configure</Button>
                </div>
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-slate-600">SMS Notifications</label>
                  <p className="text-slate-500 text-sm mt-1">Get instant alerts on your phone</p>
                  <Button variant="outline" className="mt-2">Configure</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DocumentUploadItem({ title, status, expirationDate }: any) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
      <div className="flex-1">
        <p className="font-medium text-slate-900">{title}</p>
        {expirationDate && (
          <p className="text-sm text-slate-500">Expires: {new Date(expirationDate).toLocaleDateString()}</p>
        )}
      </div>
      <Badge variant={status === "verified" ? "default" : "secondary"}>
        {status === "verified" ? "✓ Verified" : "Pending"}
      </Badge>
    </div>
  );
}
