
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { UserManagement } from '@/components/UserManagement';
import { ClassManagement } from '@/components/ClassManagement';
import { ReservationManagement } from '@/components/ReservationManagement';
import { MemberDashboard } from '@/components/MemberDashboard';
import { InstructorDashboard } from '@/components/InstructorDashboard';
import type { User } from '../../server/src/schema';

// Demo data for standalone operation
const demoUsers: User[] = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@gym.com',
    phone: '+1234567890',
    role: 'admin',
    membership_status: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'John Smith',
    email: 'john@gym.com',
    phone: '+1234567891',
    role: 'instructor',
    membership_status: null,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15')
  },
  {
    id: 3,
    name: 'Alice Johnson',
    email: 'alice@email.com',
    phone: '+1234567892',
    role: 'member',
    membership_status: 'active',
    created_at: new Date('2024-02-01'),
    updated_at: new Date('2024-02-01')
  }
];

function App() {
  const [currentUser, setCurrentUser] = useState<User>(demoUsers[0]);
  const [users, setUsers] = useState<User[]>(demoUsers);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      if (result.length > 0) {
        setUsers(result);
        setCurrentUser(result[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Continue with demo data - no need to change state
    }
  }, []);

  useEffect(() => {
    // Load from API in background but don't block UI
    loadUsers();
  }, [loadUsers]);

  const switchUser = (user: User) => {
    setCurrentUser(user);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏋️ FitGym CRM</h1>
              <p className="text-sm text-gray-600">Class Reservation Management System</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-gray-900">{currentUser.name}</p>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(currentUser.role)}>
                    {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                  </Badge>
                  {currentUser.membership_status && (
                    <Badge className={getStatusColor(currentUser.membership_status)}>
                      {currentUser.membership_status.charAt(0).toUpperCase() + currentUser.membership_status.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
              {users.length > 1 && (
                <div className="border-l pl-4">
                  <p className="text-xs text-gray-500 mb-2">Switch User (Demo)</p>
                  <div className="flex gap-1">
                    {users.slice(0, 3).map((user: User) => (
                      <Button
                        key={user.id}
                        variant={currentUser.id === user.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => switchUser(user)}
                        className="text-xs"
                      >
                        {user.role}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {currentUser.role === 'member' ? (
          <MemberDashboard currentUser={currentUser} />
        ) : currentUser.role === 'instructor' ? (
          <InstructorDashboard currentUser={currentUser} />
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">📊 Overview</TabsTrigger>
              <TabsTrigger value="classes">🏃 Classes</TabsTrigger>
              <TabsTrigger value="members">👥 Members</TabsTrigger>
              <TabsTrigger value="reservations">📅 Reservations</TabsTrigger>
              <TabsTrigger value="reports">📈 Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <span className="text-2xl">👥</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.filter(u => u.role === 'member').length}</div>
                    <p className="text-xs text-muted-foreground">Active gym members</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                    <span className="text-2xl">🏃</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">5</div>
                    <p className="text-xs text-muted-foreground">Scheduled this week</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Reservations</CardTitle>
                    <span className="text-2xl">📅</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground">Bookings for today</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Instructors</CardTitle>
                    <span className="text-2xl">🏅</span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.filter(u => u.role === 'instructor').length}</div>
                    <p className="text-xs text-muted-foreground">Professional trainers</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>📈 Recent Activity</CardTitle>
                    <CardDescription>Latest system activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New member registration</p>
                          <p className="text-xs text-gray-500">{currentUser.name} - 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Class booking confirmed</p>
                          <p className="text-xs text-gray-500">Morning Yoga - 3 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">New class scheduled</p>
                          <p className="text-xs text-gray-500">HIIT Training - 5 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>⚡ Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline">
                      ➕ Add New Member
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      🏃 Create Class
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      📧 Send Notifications
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      📊 Generate Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="classes">
              <ClassManagement currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="members">
              <UserManagement currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="reservations">
              <ReservationManagement currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>📈 Reports & Analytics</CardTitle>
                  <CardDescription>Business intelligence and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-20 flex-col">
                      <span className="text-2xl mb-2">📊</span>
                      Membership Analytics
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <span className="text-2xl mb-2">📈</span>
                      Class Attendance
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <span className="text-2xl mb-2">💰</span>
                      Revenue Reports
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <span className="text-2xl mb-2">⏱️</span>
                      Peak Hours Analysis
                    </Button>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Demo Mode:</strong> Reports feature working with sample data. Connect to analytics service for live metrics.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default App;
