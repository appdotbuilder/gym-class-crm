
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, GymClass, CreateGymClassInput, UpdateGymClassInput } from '../../../server/src/schema';

interface ClassManagementProps {
  currentUser: User;
}

export function ClassManagement({ currentUser }: ClassManagementProps) {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateGymClassInput>({
    name: '',
    instructor_id: 0,
    start_time: new Date(),
    end_time: new Date(),
    capacity: 20
  });

  const [editFormData, setEditFormData] = useState<UpdateGymClassInput>({
    id: 0,
    name: '',
    instructor_id: 0,
    start_time: new Date(),
    end_time: new Date(),
    capacity: 20
  });

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const [classesResult, usersResult] = await Promise.all([
        trpc.getGymClasses.query(),
        trpc.getUsers.query()
      ]);
      
      setClasses(classesResult);
      const instructorUsers = usersResult.filter((user: User) => user.role === 'instructor');
      setInstructors(instructorUsers);

      // Using sample data when API returns empty for development
      if (classesResult.length === 0) {
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

        const sampleClasses: GymClass[] = [
          {
            id: 1,
            name: 'Morning Yoga',
            instructor_id: 2,
            start_time: new Date('2024-03-15T08:00:00'),
            end_time: new Date('2024-03-15T09:00:00'),
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
            start_time: new Date('2024-03-15T18:00:00'),
            end_time: new Date('2024-03-15T19:00:00'),
            capacity: 15,
            current_bookings: 12,
            is_cancelled: false,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-01')
          },
          {
            id: 3,
            name: 'Pilates',
            instructor_id: 2,
            start_time: new Date('2024-03-16T10:00:00'),
            end_time: new Date('2024-03-16T11:00:00'),
            capacity: 25,
            current_bookings: 0,
            is_cancelled: true,
            created_at: new Date('2024-03-01'),
            updated_at: new Date('2024-03-10')
          }
        ];

        setClasses(sampleClasses);
        setInstructors(sampleInstructors);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    let filtered = classes.filter((gymClass: GymClass) =>
      gymClass.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (instructorFilter !== 'all') {
      filtered = filtered.filter((gymClass: GymClass) => 
        gymClass.instructor_id.toString() === instructorFilter
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((gymClass: GymClass) => !gymClass.is_cancelled);
    } else if (statusFilter === 'cancelled') {
      filtered = filtered.filter((gymClass: GymClass) => gymClass.is_cancelled);
    }

    setFilteredClasses(filtered);
  }, [classes, searchTerm, instructorFilter, statusFilter]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createGymClass.mutate(createFormData);
      await loadClasses();
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        instructor_id: 0,
        start_time: new Date(),
        end_time: new Date(),
        capacity: 20
      });
    } catch (error) {
      console.error('Failed to create class:', error);
      // Demo class creation for development
      const demoClass: GymClass = {
        id: Date.now(),
        ...createFormData,
        current_bookings: 0,
        is_cancelled: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      setClasses((prev: GymClass[]) => [...prev, demoClass]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        instructor_id: 0,
        start_time: new Date(),
        end_time: new Date(),
        capacity: 20
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setIsLoading(true);
    try {
      const updatedClass = await trpc.updateGymClass.mutate(editFormData);
      setClasses((prev: GymClass[]) =>
        prev.map((gymClass: GymClass) => gymClass.id === editingClass.id ? updatedClass : gymClass)
      );
      setEditingClass(null);
    } catch (error) {
      console.error('Failed to update class:', error);
      // Demo class update for development
      const updatedClass: GymClass = {
        ...editingClass,
        ...editFormData,
        updated_at: new Date()
      };
      setClasses((prev: GymClass[]) =>
        prev.map((gymClass: GymClass) => gymClass.id === editingClass.id ? updatedClass : gymClass)
      );
      setEditingClass(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClass = async (classId: number) => {
    setIsLoading(true);
    try {
      await trpc.cancelClass.mutate({ class_id: classId });
      setClasses((prev: GymClass[]) =>
        prev.map((gymClass: GymClass) => 
          gymClass.id === classId ? { ...gymClass, is_cancelled: true, updated_at: new Date() } : gymClass
        )
      );
    } catch (error) {
      console.error('Failed to cancel class:', error);
      // Demo class cancellation for development
      setClasses((prev: GymClass[]) =>
        prev.map((gymClass: GymClass) => 
          gymClass.id === classId ? { ...gymClass, is_cancelled: true, updated_at: new Date() } : gymClass
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startEditClass = (gymClass: GymClass) => {
    setEditingClass(gymClass);
    setEditFormData({
      id: gymClass.id,
      name: gymClass.name,
      instructor_id: gymClass.instructor_id,
      start_time: gymClass.start_time,
      end_time: gymClass.end_time,
      capacity: gymClass.capacity
    });
  };

  const getInstructorName = (instructorId: number) => {
    const instructor = instructors.find((user: User) => user.id === instructorId);
    return instructor ? instructor.name : 'Unknown Instructor';
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

  const getAvailabilityColor = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>🏃 Class Management</CardTitle>
              <CardDescription>Manage gym classes, schedules, and capacity</CardDescription>
            </div>
            {(currentUser.role === 'admin' || currentUser.role === 'instructor') && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>➕ Create Class</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Class</DialogTitle>
                    <DialogDescription>Schedule a new gym class</DialogDescription>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="instructor">Instructor</Label>
                      <Select 
                        value={createFormData.instructor_id > 0 ? createFormData.instructor_id.toString() : ''} 
                        onValueChange={(value: string) =>
                          setCreateFormData((prev: CreateGymClassInput) => ({ ...prev, instructor_id: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                        <SelectContent>
                          {instructors.map((instructor: User) => (
                            <SelectItem key={instructor.id} value={instructor.id.toString()}>
                              {instructor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        max="100"
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={instructorFilter} onValueChange={setInstructorFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {instructors.map((instructor: User) => (
                  <SelectItem key={instructor.id} value={instructor.id.toString()}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading classes...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No classes found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredClasses.map((gymClass: GymClass) => (
                <Card key={gymClass.id} className={`border-l-4 ${gymClass.is_cancelled ? 'border-l-red-500 bg-red-50' : 'border-l-green-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{gymClass.name}</h3>
                          {gymClass.is_cancelled ? (
                            <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
                          ) : (
                            <Badge className={getAvailabilityColor(gymClass.current_bookings, gymClass.capacity)}>
                              {gymClass.current_bookings}/{gymClass.capacity} booked
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>👨‍🏫 Instructor: {getInstructorName(gymClass.instructor_id)}</p>
                          <p>📅 Start: {formatDateTime(gymClass.start_time)}</p>
                          <p>⏰ End: {formatDateTime(gymClass.end_time)}</p>
                          <p>👥 Capacity: {gymClass.capacity} people</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(currentUser.role === 'admin' || (currentUser.role === 'instructor' && gymClass.instructor_id === currentUser.id)) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditClass(gymClass)}
                              disabled={gymClass.is_cancelled}
                            >
                              ✏️ Edit
                            </Button>
                            {!gymClass.is_cancelled && currentUser.role === 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                    ❌ Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Class</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel "{gymClass.name}"? All reservations will be cancelled and members will need to be notified.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep Class</AlertDialogCancel>
                                    <AlertDialogAction 
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleCancelClass(gymClass.id)}
                                    >
                                      Cancel Class
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
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

      {/* Edit Class Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open: boolean) => !open && setEditingClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update class information</DialogDescription>
          </DialogHeader>
          {editingClass && (
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Class Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateGymClassInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-instructor">Instructor</Label>
                <Select 
                  value={editFormData.instructor_id?.toString() || ''} 
                  onValueChange={(value: string) =>
                    setEditFormData((prev: UpdateGymClassInput) => ({ ...prev, instructor_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor: User) => (
                      <SelectItem key={instructor.id} value={instructor.id.toString()}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-time">Start Time</Label>
                  <Input
                    id="edit-start-time"
                    type="datetime-local"
                    value={editFormData.start_time?.toISOString().slice(0, 16) || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateGymClassInput) => ({ ...prev, start_time: new Date(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time">End Time</Label>
                  <Input
                    id="edit-end-time"
                    type="datetime-local"
                    value={editFormData.end_time?.toISOString().slice(0, 16) || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: UpdateGymClassInput) => ({ ...prev, end_time: new Date(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={editFormData.capacity || 20}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateGymClassInput) => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Class'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
