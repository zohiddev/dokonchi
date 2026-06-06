import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateUser, useDeleteUser, useUsers } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { date } from '../lib/format';
import type { Role, User } from '../types/api';

interface UserFormValues {
  name: string;
  phone: string;
  password: string;
  role: Role;
}

export function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const users = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = async (u: User) => {
    if (!confirm(`"${u.name}" foydalanuvchini o'chirish?`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success("Foydalanuvchi o'chirildi");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Ism',
      render: (u) => (
        <div>
          <strong>{u.name}</strong>
          {u.id === currentUser?.id && (
            <small style={{ display: 'block', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              (siz)
            </small>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (u) => <span className="num">{u.phone}</span>,
      width: '180px',
    },
    {
      key: 'role',
      header: 'Rol',
      render: (u) =>
        u.role === 'ADMIN' ? (
          <Tag tone="green">Administrator</Tag>
        ) : (
          <Tag tone="amber">Sotuvchi</Tag>
        ),
      width: '140px',
    },
    {
      key: 'created',
      header: "Qo'shilgan",
      render: (u) => (
        <small style={{ color: 'var(--ink-soft)' }}>{date(u.createdAt, true)}</small>
      ),
      width: '120px',
    },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        u.id !== currentUser?.id ? (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}>
            O'chirish
          </Button>
        ) : null,
      align: 'right',
      width: '120px',
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
          Faqat ADMIN ko'ra oladi va boshqaradi
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<IconPlus />}>
          Yangi foydalanuvchi
        </Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={users.data}
          rowKey={(u) => u.id}
          isLoading={users.isLoading}
          emptyTitle="Foydalanuvchi yo'q"
        />
      </Card>

      <NewUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (v) => {
          try {
            await createUser.mutateAsync({
              name: v.name,
              phone: v.phone,
              password: v.password,
              role: v.role,
            });
            toast.success("Foydalanuvchi qo'shildi");
            setModalOpen(false);
          } catch (e) {
            toast.error(extractError(e));
          }
        }}
      />

      <style>{`
        .page-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

function NewUserModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: UserFormValues) => Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<UserFormValues>({
    defaultValues: { role: 'SOTUVCHI' },
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Yangi foydalanuvchi"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button
            onClick={handleSubmit(async (v) => { await onSubmit(v); reset({ role: 'SOTUVCHI' }); })}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Ism" error={errors.name?.message}>
          <input
            {...register('name', { required: "Ism kerak" })}
            placeholder="Sotuvchi Vali"
            autoFocus
          />
        </Field>
        <Field label="Telefon" error={errors.phone?.message}>
          <input
            {...register('phone', {
              required: 'Telefon kerak',
              pattern: { value: /^\+?\d{9,15}$/, message: "Telefon formati noto'g'ri" },
            })}
            placeholder="+998901112233"
            inputMode="tel"
          />
        </Field>
        <Field label="Parol" error={errors.password?.message}>
          <input
            type="password"
            {...register('password', {
              required: 'Parol kerak',
              minLength: { value: 6, message: 'Parol kamida 6 belgi bo\'lishi kerak' },
            })}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Rol">
          <select {...register('role')}>
            <option value="SOTUVCHI">Sotuvchi</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </Field>
      </form>

      <style>{`
        .form { display: flex; flex-direction: column; gap: 13px; }
      `}</style>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="err">{error}</small>}
      <style>{`
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .field input, .field select {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          outline: none; font-family: inherit;
        }
        .field input:focus, .field select:focus {
          border-color: var(--accent); background: var(--card);
        }
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
