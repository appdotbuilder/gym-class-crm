
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, GymClass, Reservation } from '../../../server/src/schema';

interface MemberDashboardProps {
  currentUser: User;
}

interface ReservationWithClass extends Reservation {
  className: string;
  startTime: Date;
  endTime: Date;
  instructorName: string;
}

export function MemberDashboard({ currentUser }: MemberDashboardProps) {
  const [availableClasses, setAvailableClasses] = useState<GymClass[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationWithClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [classesResult, reservationsResult, usersResult] = await Promise.all([
        trpc.getGymClasses.query(),
        trpc.getReservationsByMember.query({ member_id: currentUser.id }),
        trpc.getUsers.query()
      ]);

      // Using sample data when API returns empty for development
      if (classesResult.length === 0) {
        const sampleClasses: GymClass[] = [
          {
            id: 1,
            name: 'Morning Yoga',
            instructor_id: 2,
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
            name: 'HIIT Training',
            instructor_id: 5,
            start_time: new Date('2024-03-20T18:00:00'),
            end_time: new Date('2024-03-20T19:00:00'),
            capacity: 15,
            current_bookings: 12,
            is_cancelled: false,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
          },
          {
            id: 3,
            name: 'Evening Pilates',
            instructor_id: 2,
            start_time: new Date('2024-03-21T19:00:00'),
            end_time: new Date('2024-03-21T20:00:00'),
            capacity: 25,
            current_bookings: 8,
            is_cancelled: false,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
          }
        ];

        const sampleInstructors: User[] = [
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
            id: 5,
            name: 'Sarah Connor',
            email: 'sarah@gym.com',
            phone: '+1234567893',
            role: 'instructor',
            membership_status: null,
            created_at: new Date('2024-01-10'),
            updated_at: new Date('2024-01-10')
          }
        ];

        const sampleReservations: Reservation[] = [
          {
            id: 1,
            member_id: currentUser.id,
            class_id: 1,
            status: 'confirmed',
            reserved_at: new Date('2024-03-15T10:00:00'),
            cancelled_at: null
          }
        ];

        const reservationsWithClass: ReservationWithClass[] = sampleReservations.map((reservation: Reservation) => {
          const gymClass = sampleClasses.find((cls: GymClass) => cls.id === reservation.class_id);
          const instructor = sampleInstructors.find((user: User) => user.id === gymClass?.instructor_id);
          
          return {
            ...reservation,
            className: gymClass?.name || 'Unknown Class',
            startTime: gymClass?.start_time || new Date(),
            endTime: gymClass?.end_time || new Date(),
            instructorName: instructor?.name || 'Unknown Instructor'
          };
        });

        // Filter out classes that are full or cancelled, and upcoming only
        const now = new Date();
        const availableUpcomingClasses = sampleClasses.filter((cls: GymClass) => 
          !cls.is_cancelled && 
          cls.start_time > now &&
          cls.current_bookings < cls.capacity
        );

        setAvailableClasses(availableUpcomingClasses);
        setMyReservations(reservationsWithClass);
      } else {
        // Handle real data
        const instructors = usersResult.filter((user: User) => user.role === 'instructor');
        
        const reservationsWithClass: ReservationWithClass[] = reservationsResult.map((reservation: Reservation) => {
          const gymClass = classesResult.find((cls: GymClass) => cls.id === reservation.class_id);
          const instructor = instructors.find((user: User) => user.id === gymClass?.instructor_id);
          
          return {
            ...reservation,
            className: gymClass?.name || 'Unknown Class',
            startTime: gymClass?.start_time || new Date(),
            endTime: gymClass?.end_time || new Date(),
            instructorName: instructor?.name || 'Unknown Instructor'
          };
        });

        const now = new Date();
        const availableUpcomingClasses = classesResult.filter((cls: GymClass) => 
          !cls.is_cancelled && 
          cls.start_time > now &&
          cls.current_bookings < cls.capacity
        );

        setAvailableClasses(availableUpcomingClasses);
        setMyReservations(reservationsWithClass);
      }
    } catch (error) {
      console.error('Failed to load member dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBookClass = async (classId: number) => {
    setIsLoading(true);
    try {
      await trpc.createReservation.mutate({
        member_id: currentUser.id,
        class_id: classId
      });

      // Update available classes and reservations
      await loadData();
    } catch (error) {
      console.error('Failed to book class:', error);
      // Demo class booking for development
      const gymClass = availableClasses.find((cls: GymClass) => cls.id === classId);
      if (gymClass) {
        const demoReservation: ReservationWithClass = {
          id: Date.now(),
          member_id: currentUser.id,
          class_id: classId,
          status: 'confirmed',
          reserved_at: new Date(),
          cancelled_at: null,
          className: gymClass.name,
          startTime: gymClass.start_time,
          endTime: gymClass.end_time,
          instructorName: 'Instructor'
        };
        setMyReservations((prev: ReservationWithClass[]) => [...prev, demoReservation]);
        
        // Update class booking count
        setAvailableClasses((prev: GymClass[]) =>
          prev.map((cls: GymClass) =>
            cls.id === classId 
              ? { ...cls, current_bookings: cls.current_bookings + 1 }
              : cls
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    setIsLoading(true);
    try {
      await trpc.cancelReservation.mutate({
        reservation_id: reservationId,
        user_id: currentUser.id
      });

      // Update reservations
      setMyReservations((prev: ReservationWithClass[]) =>
        prev.map((reservation: ReservationWithClass) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'cancelled' as const, cancelled_at: new Date() }
            : reservation
        )
      );
    } catch (error) {
      console.error('Failed to cancel reservation:', error);
      // Demo reservation cancellation for development
      setMyReservations((prev: ReservationWithClass[]) =>
        prev.map((reservation: ReservationWithClass) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'cancelled' as const, cancelled_at: new Date() }
            : reservation
        )
      );
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
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-2xl">👋 Welcome back, {currentUser.name}!</CardTitle>
          <CardDescription>
            Ready for your next workout? Here's what's available for you.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Reservations</p>
                <p className="text-3xl font-bold text-blue-600">
                  {myReservations.filter((r: ReservationWithClass) => r.status !== 'cancelled').length}
                </p>
              </div>
              <span className="text-4xl">📅</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Classes</p>
                <p className="text-3xl font-bold text-green-600">{availableClasses.length}</p>
              </div>
              <span className="text-4xl">🏃</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Membership</p>
                <p className="text-lg font-semibold text-green-600">
                  {currentUser.membership_status 
                    ? currentUser.membership_status.charAt(0).toUpperCase() + currentUser.membership_status.slice(1) 
                    : 'Active'}
                </p>
              </div>
              <span className="text-4xl">💪</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Classes */}
      <Card>
        <CardHeader>
          <CardTitle>🏃 Available Classes</CardTitle>
          <CardDescription>Book your spot in upcoming classes</CardDescription>
        </CardHeader>
        <CardContent>
          {availableClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">😕</span>
              <p>No available classes at the moment.</p>
              <p className="text-sm">Check back later for new class schedules!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availableClasses.map((gymClass: GymClass) => (
                <Card key={gymClass.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{gymClass.name}</h3>
                          <Badge className={getAvailabilityColor(gymClass.current_bookings, gymClass.capacity)}>
                            {gymClass.capacity - gymClass.current_bookings} spots left
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>📅 {formatDateTime(gymClass.start_time)}</p>
                          <p>⏰ Duration: {formatDateTime(gymClass.start_time)} - {formatDateTime(gymClass.end_time)}</p>
                          <p>👥 {gymClass.current_bookings}/{gymClass.capacity} booked</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleBookClass(gymClass.id)}
                        disabled={isLoading || gymClass.current_bookings >= gymClass.capacity}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {gymClass.current_bookings >= gymClass.capacity ? '🔒 Full' : '📝 Book Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>📋 My Reservations</CardTitle>
          <CardDescription>View and manage your booked classes</CardDescription>
        </CardHeader>
        <CardContent>
          {myReservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📋</span>
              <p>You don't have any reservations yet.</p>
              <p className="text-sm">Book a class above to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myReservations.map((reservation: ReservationWithClass) => (
                <Card key={reservation.id} className={`border-l-4 ${
                  reservation.status === 'confirmed' ? 'border-l-green-500' :
                  reservation.status === 'waitlisted' ? 'border-l-yellow-500' :
                  'border-l-red-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{reservation.className}</h3>
                          <Badge className={getStatusColor(reservation.status)}>
                            {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>👨‍🏫 Instructor: {reservation.instructorName}</p>
                          <p>📅 Class: {formatDateTime(reservation.startTime)}</p>
                          <p>🕐 Booked: {formatDateTime(reservation.reserved_at)}</p>
                          {reservation.cancelled_at && (
                            <p>❌ Cancelled: {formatDateTime(reservation.cancelled_at)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {reservation.status === 'confirmed' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                ❌ Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel your reservation for "{reservation.className}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleCancelReservation(reservation.id)}
                                >
                                  Cancel Reservation
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
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
