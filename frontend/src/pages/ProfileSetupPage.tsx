import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { User, BookOpen, Phone, Layers, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ROUTES, DEPARTMENTS } from '@/constants';
import { getErrorMessage } from '@/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  usn: z.string().min(1, 'USN is required').max(50),
  department: z.enum(['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'BT', 'CH', 'MBA', 'MCA', 'Other']),
  semester: z.coerce.number().int().min(1, 'Min 1').max(8, 'Max 8'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, setProfile, setUser } = useAuthStore();

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const onSubmit = async (data: ProfileForm) => {
    try {
      const profile = await authService.completeProfile(data);
      setProfile(profile);
      if (user) setUser({ ...user, profileCompleted: true });
      toast.success('Profile created! Welcome to ACM Competition Platform 🎉');
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to save profile');
      toast.error(msg);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', padding: '80px 24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 520 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={26} color="white" />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#f5f5f5' }}>
            Complete Your Profile
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Required to participate in competitions
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="glass" style={{ borderRadius: 20, padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              label="Full Name"
              placeholder="Yuvaraj Khot"
              leftElement={<User size={15} />}
              error={errors.name?.message}
              required
              {...register('name')}
            />

            <Input
              label="USN (University Seat Number)"
              placeholder="4NM22CS001"
              leftElement={<BookOpen size={15} />}
              error={errors.usn?.message}
              required
              {...register('usn')}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Select
                label="Department"
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
                min={1}
                max={8}
                placeholder="6"
                leftElement={<Layers size={15} />}
                error={errors.semester?.message}
                required
                {...register('semester')}
              />
            </div>

            <Input
              label="Phone Number"
              type="tel"
              placeholder="9876543210"
              leftElement={<Phone size={15} />}
              error={errors.phone?.message}
              required
              {...register('phone')}
            />

            {/* Info */}
            <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  USN must be unique. Your details will be verified by admins. Use your official college USN.
                </p>
              </div>
            </div>

            <Button type="submit" loading={isSubmitting} size="lg" style={{ width: '100%' }}>
              Save Profile & Continue
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
