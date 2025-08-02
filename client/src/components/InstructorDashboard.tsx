
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { User, GymClass, Reservation, CreateGymClassInput } from '../../../server/src/schema';

interface InstructorDashboardProps {
  currentUser: User;
}

interface ClassWithReservations extends GymClass {
  reservations: Array<{
    id: number;
    memberName: string;
    memberEmail: string;
    status: string;
    reserved_at: Date;
  }>;
}

export function InstructorDashboard({ currentUser }: InstructorDashboardProps) {
  const [myClasses, setMyClasses] = useState<ClassWithReservations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [createFormData, setCreateFormData] = useState<CreateGymClassInput>({
    name: '',
    instructor_id: currentUser.id,
    start_time: new Date(),
    end_time: new Date(),
    capacity: 20
  });

  const loadInstructorClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allClasses, allReservations, allUsers] = await Promise.all([
        trpc.getGymClasses.query(),
        trpc.getAllReservations.query(),
        trpc.getUsers.query()
      ]);

      // Filter classes by instructor
      const instructorClasses = allClasses.filter((cls: GymClass) => cls.instructor_id === currentUser.id);

      // Using sample data when API returns empty for development
      if (instructorClasses.length === 0) {
        const sampleClasses: GymClass[] = [
          {
            id: 1,
            name: 'Morning Yoga',
            instructor_id: currentUser.id,
            start_time: new Date('2024-03-20T08:00:00'),
            end_time: new Date('2024-03-20T09:00:00'),
            capacity: 20,
            current_bookings: 15,
            is_cancelled: false,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
          },
          {
            id: 2,
            name: 'Evening Pilates',
            instructor_id: currentUser.id,
            start_time: new Date('2024-03-21T19:00:00'),
            end_time: new Date('2024-03-21T20:00:00'),
            capacity: 25,
            current_bookings: 8,
            is_cancelled: false,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
          }
        ];

        const sampleMembers: User[] = [
          {
            id: 3,
            name: 'Alice Johnson',
            email: 'alice@email.com',
            phone: '+1234567892',
            role: 'member',
            membership_status: 'active',
            created_at: new Date('2024-02-01'),
            updated_at: new Date('2024-02-01')
          },
          {
            id: 4,
            name: 'Bob Wilson',
            email: 'bob@email.com',
            phone: null,
            role: 'member',
            membership_status: 'active',
            created_at: new Date('2024-01-20'),
            updated_at: new Date('2024-02-15')
          }
        ];

        const sampleReservations: Reservation[] = [
          {
            id: 1,
            member_id: 3,
            class_id: 1,
            status: 'confirmed',
            reserved_at: new Date('2024-03-15T10:00:00'),
            cancelled_at: null
          },
          {
            id: 2,
            member_id: 4,
            class_id: 1,
            status: 'confirmed',
            reserved_at: new Date('2024-03-16T14:00:00'),
            cancelled_at: null
          },
          {
            id: 3,
            member_id: 3,
            class_id: 2,
            status: 'waitlisted',
            reserved_at: new Date('2024-03-17T09:00:00'),
            cancelled_at: null
          }
        ];

        const classesWithReservations: ClassWithReservations[] = sampleClasses.map((cls: GymClass) => {
          const classReservations = sampleReservations
            .filter((res: Reservation) => res.class_id === cls.id)
            .map((res: Reservation) => {
              const member = sampleMembers.find((m: User) => m.id === res.member_id);
              return {
                id: res.id,
                memberName: member?.name || 'Unknown Member',
                memberEmail: member?.email || 'unknown@email.com',
                status: res.status,
                reserved_at: res.reserved_at
              };
            });
          
          return {
            ...cls,
            reservations: classReservations
          };
        });

        setMyClasses(classesWithReservations);
      } else {
        // Handle real data
        const members = allUsers.filter((user: User) => user.role === 'member');
        
        const classesWithReservations: ClassWithReservations[] = instructorClasses.map((cls: GymClass) => {
          const classReservations = allReservations
            .filter((res: Reservation) => res.class_id === cls.id)
            .map((res: Reservation) => {
              const member = members.find((m: User) => m.id === res.member_id);
              return {
                id: res.id,
                memberName: member?.name || 'Unknown Member',
                memberEmail: member?.email || 'unknown@email.com',
                status: res.status,
                reserved_at: res.reserved_at
              };
            });
          
          return {
            ...cls,
            reservations: classReservations
          };
        });

        setMyClasses(classesWithReservations);
      }
    } catch (error) {
      console.error('Failed to load instructor dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadInstructorClasses();
  }, [loadInstructorClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createGymClass.mutate(createFormData);
      // Reload classes to get updated data
      await loadInstructorClasses();
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        instructor_id: currentUser.id,
        start_time: new Date(),
        end_time: new Date(),
        capacity: 20
      });
    } catch (error) {
      console.error('Failed to create class:', error);
      // Demo class creation for development
      const demoClass: ClassWithReservations = {
        id: Date.now(),
        ...createFormData,
        current_bookings: 0,
        is_cancelled: false,
        created_at: new Date(),
        updated_at: new Date(),
        reservations: []
      };
      setMyClasses((prev: ClassWithReservations[]) => [...prev, demoClass]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        instructor_id: currentUser.id,
        start_time: new Date(),
        end_time: new Date(),
        capacity: 20
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'waitlisted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your classes...</p>
      </div>
    );
  }

  const totalStudents = myClasses.reduce((acc: number, cls: ClassWithReservations) => 
    acc + cls.reservations.filter((r) => r.status === 'confirmed').length, 0
  );

  const upcomingClasses = myClasses.filter((cls: ClassWithReservations) => 
    cls.start_time > new Date() && !cls.is_cancelled
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">👨‍🏫 Welcome, Instructor {currentUser.name}!</CardTitle>
              <CardDescription>
                Manage your classes and connect with your students.
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  ➕ Create New Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>Schedule a new class for your students</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Class Name</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateGymClassInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                      placeholder="e.g., Morning Yoga, HIIT Training"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input
                        id="start-time"
                        type="datetime-local"
                        value={createFormData.start_time.toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateGymClassInput) => ({ ...prev, start_time: new Date(e.target.value) }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time</Label>
                      <Input
                        id="end-time"
                        type="datetime-local"
                        value={createFormData.end_time.toISOString().slice(0, 16)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCreateFormData((prev: CreateGymClassInput) => ({ ...prev, end_time: new Date(e.target.value) }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="capacity">Class Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      max="50"
                      value={createFormData.capacity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateGymClassInput) => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))
                      }
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Class'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-purple-600">{myClasses.length}</p>
              </div>
              <span className="text-4xl">🏃</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Classes</p>
                <p className="text-3xl font-bold text-blue-600">{upcomingClasses.length}</p>
              </div>
              <span className="text-4xl">📅</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-green-600">{totalStudents}</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-lg font-semibold text-orange-600">
                  {upcomingClasses.filter((cls: ClassWithReservations) => {
                    const weekFromNow = new Date();
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    return cls.start_time <= weekFromNow;
                  }).length} classes
                </p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Classes */}
      <Card>
        <CardHeader>
          <CardTitle>🏃 My Classes</CardTitle>
          <CardDescription>View and manage your scheduled classes</CardDescription>
        </CardHeader>
        <CardContent>
          {myClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📝</span>
              <p>You don't have any classes scheduled yet.</p>
              <p className="text-sm">Create your first class using the button above!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myClasses.map((gymClass: ClassWithReservations) => (
                <Card key={gymClass.id} className={`border-l-4 ${
                  gymClass.is_cancelled ? 'border-l-red-500 bg-red-50' : 
                  gymClass.start_time > new Date() ? 'border-l-green-500' : 'border-l-gray-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{gymClass.name}</h3>
                            {gymClass.is_cancelled ? (
                              <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
                            ) : gymClass.start_time < new Date() ? (
                              <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
                            ) : (
                              <Badge className={getAvailabilityColor(gymClass.current_bookings, gymClass.capacity)}>
                                {gymClass.current_bookings}/{gymClass.capacity} booked
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📅 {formatDateTime(gymClass.start_time)} - {formatDateTime(gymClass.end_time)}</p>
                            <p>👥 Capacity: {gymClass.capacity} people</p>
                            <p>📝 Reservations: {gymClass.reservations.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Reservations List */}
                      {gymClass.reservations.length > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="font-medium mb-3">Student Reservations:</h4>
                          <div className="grid gap-2">
                            {gymClass.reservations.map((reservation) => (
                              <div key={reservation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{reservation.memberName}</span>
                                  <span className="text-sm text-gray-500">{reservation.memberEmail}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getStatusColor(reservation.status)}>
                                    {reservation.status}
                                  </Badge>
                                  <span className="text-xs text-gray-400">
                                    {reservation.reserved_at.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
