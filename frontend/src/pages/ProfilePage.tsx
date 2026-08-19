import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User, BookOpen, Phone, Layers, Save, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DEPARTMENTS } from '@/constants';
import { getRankSuffix, getErrorMessage } from '@/utils';

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  department: z.enum(['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'BT', 'CH', 'MBA', 'MCA', 'Other']),
  semester: z.coerce.number().int().min(1).max(8),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
});

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: profile?.name || '',
      department: (profile?.department as any) || '',
      semester: profile?.semester || 1,
      phone: profile?.phone || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        department: (profile.department as any) || '',
        semester: profile.semester || 1,
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileUpdateForm) => {
    try {
      const updated = await authService.completeProfile({
        ...data,
        usn: profile?.usn || '',
      });
      setProfile(updated);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Update failed'));
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (profile) {
      reset({
        name: profile.name || '',
        department: (profile.department as any) || '',
        semester: profile.semester || 1,
        phone: profile.phone || '',
      });
    }
    setEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    if (profile) {
      reset({
        name: profile.name || '',
        department: (profile.department as any) || '',
        semester: profile.semester || 1,
        phone: profile.phone || '',
      });
    }
    setEditing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingTop: 80 }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            My Profile
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text-secondary)' }}>
            Manage your personal details and academic credentials
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass"
            style={{ borderRadius: 16, padding: 32 }}
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Email (Readonly) */}
                <Input
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  hint="Email address cannot be changed."
                />

                {/* USN (Readonly once saved) */}
                <Input
                  label="USN (University Seat Number)"
                  value={profile?.usn || ''}
                  disabled
                  hint="USN cannot be changed. Contact admins if this is incorrect."
                  leftElement={<BookOpen size={15} />}
                />

                <Input
                  label="Full Name"
                  disabled={!editing}
                  error={errors.name?.message}
                  leftElement={<User size={15} />}
                  required
                  {...register('name')}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Select
                    label="Department"
                    disabled={!editing}
                    error={errors.department?.message}
                    required
                    options={[
                      { value: '', label: 'Select Department' },
                      ...DEPARTMENTS.map(d => ({ value: d, label: d })),
                    ]}
                    {...register('department')}
                  />

                  <Input
                    label="Semester"
                    type="number"
                    disabled={!editing}
                    error={errors.semester?.message}
                    leftElement={<Layers size={15} />}
                    required
                    {...register('semester')}
                  />
                </div>

                <Input
                  label="Phone Number"
                  type="tel"
                  disabled={!editing}
                  error={errors.phone?.message}
                  leftElement={<Phone size={15} />}
                  required
                  {...register('phone')}
                />

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                  {editing ? (
                    <>
                      <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save size={15} />}>
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={handleEditClick}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>

          {/* Academic summary sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{ position: 'sticky', top: 100 }}
          >
            <div className="glass" style={{ borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'white', fontSize: 22, fontWeight: 700,
              }}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>
                {profile?.name || 'Anonymous'}
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {profile?.usn || 'No USN'}
              </p>
              <div style={{ height: 1, background: '#1e1e1e', margin: '16px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Points</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#a855f7' }}>
                    {parseFloat(profile?.totalPoints ?? '0').toFixed(0)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Rank</p>
                  <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
                    {profile?.rank ? getRankSuffix(profile.rank) : '#1'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
