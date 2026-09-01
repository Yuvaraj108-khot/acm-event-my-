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
    <div style={{ minHeight: '100vh', background: '#050505', paddingTop: 80, position: 'relative', overflow: 'hidden' }}>
      {/* Dynamic Background Decorative Orbs */}
      <div style={{
        position: 'fixed', top: '10%', left: '10%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '15%', right: '5%', width: 450, height: 450,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 32, fontWeight: 800, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            My Profile
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
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
            <div className="glass glass-hover" style={{ borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: 'white', fontSize: 26, fontWeight: 700,
                boxShadow: '0 0 25px rgba(124, 58, 237, 0.4), inset 0 0 10px rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.15)',
              }}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <h3 className="gradient-brand-text" style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
                {profile?.name || 'Anonymous'}
              </h3>
              
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)',
                borderRadius: 99, padding: '4px 12px', marginTop: 4, marginBottom: 16
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {user?.role || 'Participant'}
                </span>
              </div>
              
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {profile?.usn || 'No USN'}
              </p>

              {user?.role !== 'participant' && (
                <>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points</p>
                      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#a855f7' }}>
                        {parseFloat(profile?.totalPoints ?? '0').toFixed(0)}
                      </p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rank</p>
                      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
                        {profile?.rank ? getRankSuffix(profile.rank) : '#1'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
