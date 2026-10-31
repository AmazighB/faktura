import type { User, ActivityLog, Settings, Notification, BackupRecord } from '@/types';
import type { UserService, ActivityLogService, SettingsService, NotificationService, BackupService } from '@/services/types';
import { mockUsers, mockActivityLogs, mockNotifications, mockBackups, defaultSettings } from '@/mocks/data';
import { delay, uid, clone, persistentStore, persistentValue } from '@/mocks/helpers';
import { createCredential, removeCredential } from '@/mocks/credentials';
import { validatePassword } from '@/utils/password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class MockUserService implements UserService {
  private usersStore = persistentStore<User>('users', mockUsers);
  private get users(): User[] { return this.usersStore.items; }
  private set users(v: User[]) { this.usersStore.items = v; }

  async list(): Promise<User[]> {
    return delay([...this.users]);
  }

  private assertEmailFree(email: string, exceptId?: string) {
    if (!EMAIL_RE.test(email)) throw new Error('Adresse email invalide.');
    if (this.users.some((x) => x.id !== exceptId && x.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Cette adresse email est déjà utilisée.');
    }
  }

  /** Il doit toujours rester au moins un administrateur actif. */
  private assertAdminRemains(before: User, after: User | null) {
    const wasActiveAdmin = before.role === 'admin' && before.active;
    const stillActiveAdmin = !!after && after.role === 'admin' && after.active;
    if (wasActiveAdmin && !stillActiveAdmin) {
      const others = this.users.some((x) => x.id !== before.id && x.role === 'admin' && x.active);
      if (!others) throw new Error('Opération impossible : il doit rester au moins un administrateur actif.');
    }
  }

  async create(data: Omit<User, 'id' | 'createdAt'>, password: string): Promise<User> {
    const email = data.email.trim().toLowerCase();
    this.assertEmailFree(email);
    const weak = validatePassword(password);
    if (weak) throw new Error(weak);
    const user: User = { ...data, name: data.name.trim(), email, id: uid('u'), createdAt: new Date().toISOString() };
    await createCredential(user.id, password);
    this.users.unshift(user);
    return delay(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const idx = this.users.findIndex((x) => x.id === id);
    if (idx === -1) throw new Error('Utilisateur introuvable');
    const before = this.users[idx];
    const next: User = { ...before, ...data, id: before.id, createdAt: before.createdAt };
    if (data.email !== undefined) {
      next.email = data.email.trim().toLowerCase();
      this.assertEmailFree(next.email, id);
    }
    this.assertAdminRemains(before, next);
    this.users[idx] = next;
    return delay(next);
  }

  async remove(id: string): Promise<void> {
    const target = this.users.find((x) => x.id === id);
    if (target) this.assertAdminRemains(target, null);
    this.users = this.users.filter((x) => x.id !== id);
    removeCredential(id);
    return delay(undefined);
  }

  // ── Accès réservé au service d'authentification ──
  _internalList(): User[] {
    return [...this.users];
  }

  _touchLogin(id: string): void {
    const idx = this.users.findIndex((x) => x.id === id);
    if (idx !== -1) this.users[idx] = { ...this.users[idx], lastLoginAt: new Date().toISOString() };
  }
}

class MockActivityLogService implements ActivityLogService {
  private logsStore = persistentStore<ActivityLog>('logs', mockActivityLogs);
  private get logs(): ActivityLog[] { return this.logsStore.items; }
  private set logs(v: ActivityLog[]) { this.logsStore.items = v; }

  async list(): Promise<ActivityLog[]> {
    return delay([...this.logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }

  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    this.logs.unshift({ ...entry, id: uid('a'), timestamp: new Date().toISOString() });
  }
}

class MockSettingsService implements SettingsService {
  private settingsStore = persistentValue<Settings>('settings', defaultSettings);
  private get settings(): Settings { return this.settingsStore.value; }
  private set settings(v: Settings) { this.settingsStore.value = v; }

  async get(): Promise<Settings> {
    return delay(clone(this.settings));
  }

  async update(data: Partial<Settings>): Promise<Settings> {
    this.settings = { ...this.settings, ...data };
    return delay(clone(this.settings));
  }
}

class MockNotificationService implements NotificationService {
  private notificationsStore = persistentStore<Notification>('notifications', mockNotifications);
  private get notifications(): Notification[] { return this.notificationsStore.items; }
  private set notifications(v: Notification[]) { this.notificationsStore.items = v; }

  async list(): Promise<Notification[]> {
    return delay([...this.notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }

  async markRead(id: string): Promise<void> {
    const n = this.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return delay(undefined);
  }

  async markAllRead(): Promise<void> {
    this.notifications.forEach((n) => (n.read = true));
    return delay(undefined);
  }
}

class MockBackupService implements BackupService {
  private backupsStore = persistentStore<BackupRecord>('backups', mockBackups);
  private get backups(): BackupRecord[] { return this.backupsStore.items; }
  private set backups(v: BackupRecord[]) { this.backupsStore.items = v; }

  async list(): Promise<BackupRecord[]> {
    return delay([...this.backups].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async createManual(): Promise<BackupRecord> {
    const backup: BackupRecord = {
      id: uid('b'),
      date: new Date().toISOString(),
      type: 'manuel',
      size: '2.4 Mo',
      location: 'C:\\Factura\\backups\\',
    };
    this.backups.unshift(backup);
    return delay(backup);
  }

  async restore(_id: string): Promise<void> {
    return delay(undefined, 500);
  }
}

export const userService = new MockUserService();
export const activityLogService = new MockActivityLogService();
export const settingsService = new MockSettingsService();
export const notificationService = new MockNotificationService();
export const backupService = new MockBackupService();