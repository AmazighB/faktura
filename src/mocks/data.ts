import type {
  ActivityLog,
  BackupRecord,
  Client,
  ClientGroup,
  CreditNote,
  Expense,
  ExpenseCategoryConfig,
  DocumentFieldsSettings,
  Invoice,
  Notification,
  Payment,
  Product,
  ProductCategory,
  Quote,
  Settings,
  Supplier,
  User,
} from '@/types';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));
const daysFromNow = (n: number) => iso(new Date(now.getTime() + n * 86400000));

export const mockProductCategories: ProductCategory[] = [
  { id: 'pc1', name: 'Sécurité', color: '#ef4444', description: 'Systèmes de surveillance et sécurité' },
  { id: 'pc2', name: 'Maintenance', color: '#f59e0b', description: 'Contrats et interventions de maintenance' },
  { id: 'pc3', name: 'Matériel', color: '#3b82f6', description: 'Équipements et matériel physique' },
  { id: 'pc4', name: 'Travaux', color: '#8b5cf6', description: 'Travaux et installations' },
  { id: 'pc5', name: 'Conseil', color: '#10b981', description: 'Consultation et audit' },
  { id: 'pc6', name: 'Formations', color: '#ec4899', description: 'Formations et coaching' },
];

export const mockClientGroups: ClientGroup[] = [
  { id: 'cg1', name: 'VIP', color: '#f59e0b', description: 'Clients prioritaires' },
  { id: 'cg2', name: 'Entreprise', color: '#3b82f6', description: 'Clients professionnels' },
  { id: 'cg3', name: 'Particulier', color: '#10b981', description: 'Clients individuels' },
];

export const mockClients: Client[] = [
  {
    id: 'c1', name: 'Clinique El Houria', type: 'entreprise', nif: '000016001234567', nis: '098765432101234',
    rc: '16/00-1234567', ai: '16001234', address: '12 Rue Didouche Mourad', wilaya: 'Alger', commune: 'Alger Centre',
    phone: '021 63 45 78', email: 'contact@clinique-elhouria.dz', secondaryContact: '0550 12 34 56',
    paymentConditions: '30 jours', defaultDiscount: 5, groupId: 'cg1', notes: 'Client fidèle depuis 2023',
    createdAt: daysAgo(220), updatedAt: daysAgo(3), lastActivityAt: daysAgo(2),
  },
  {
    id: 'c2', name: 'BTP Sahara Construction', type: 'entreprise', nif: '000030005678901', nis: '123456789012345',
    rc: '30/00-5678901', address: 'Lot 45, Zone industrielle', wilaya: 'Ouargla', commune: 'Ouargla',
    phone: '029 71 23 45', email: 'contact@sahara-btp.dz', paymentConditions: '15 jours', defaultDiscount: 0,
    createdAt: daysAgo(180), updatedAt: daysAgo(10), lastActivityAt: daysAgo(7),
  },
  {
    id: 'c3', name: 'Mohamed Benali', type: 'particulier', address: '8 Cité Diar El Mahçoul', wilaya: 'Alger',
    commune: 'Birkhadem', phone: '0661 78 90 12', email: 'm.benali@gmail.com',
    createdAt: daysAgo(150), updatedAt: daysAgo(20), lastActivityAt: daysAgo(15),
  },
  {
    id: 'c4', name: 'Pharmacie du Centre', type: 'entreprise', nif: '000016007891234', rc: '16/00-7891234',
    address: '45 Rue Larbi Ben M\'hidi', wilaya: 'Oran', commune: 'Oran',
    phone: '041 34 56 78', email: 'pharma.centre@oran.dz', paymentConditions: 'Comptant',
    createdAt: daysAgo(120), updatedAt: daysAgo(5), lastActivityAt: daysAgo(1),
  },
  {
    id: 'c5', name: 'Fatima Zohra Hadj', type: 'particulier', address: '23 Rue des Frères Bouadou',
    wilaya: 'Blida', commune: 'Blida', phone: '0770 45 67 89', email: 'fz.hadj@email.dz',
    createdAt: daysAgo(90), updatedAt: daysAgo(30), lastActivityAt: daysAgo(25),
  },
  {
    id: 'c6', name: 'TechnoDistrib SARL', type: 'entreprise', nif: '000016001112223', nis: '333444555666777',
    rc: '16/00-1112223', address: '56 Zone d\'activité, Rouiba', wilaya: 'Alger', commune: 'Rouiba',
    phone: '021 82 11 22', email: 'commercial@technodistrib.dz', paymentConditions: '45 jours', defaultDiscount: 10, groupId: 'cg2',
    createdAt: daysAgo(200), updatedAt: daysAgo(8), lastActivityAt: daysAgo(4),
  },
  {
    id: 'c7', name: 'Café El Djazair', type: 'entreprise', rc: '16/00-9988776', address: 'Angle Rue de la Liberté',
    wilaya: 'Alger', commune: 'Hydra', phone: '021 60 99 88', email: '',
    createdAt: daysAgo(60), updatedAt: daysAgo(12), lastActivityAt: daysAgo(9),
  },
  {
    id: 'c8', name: 'Karim Cherif', type: 'particulier', address: '12 Rue Ben Boulaïd', wilaya: 'Constantine',
    commune: 'Constantine', phone: '0555 33 44 55', email: 'k.cherif@email.dz',
    createdAt: daysAgo(45), updatedAt: daysAgo(45), lastActivityAt: daysAgo(40),
  },
];

export const mockProducts: Product[] = [
  {
    id: 'p1', reference: 'SRV-CAM-01', name: 'Installation caméra de surveillance', description: 'Installation complète d\'un système de caméras de surveillance', priceHT: 25000, vatRate: 19, unit: 'unité', category: 'Sécurité', type: 'service', stockEnabled: false, active: true, createdAt: daysAgo(200),
  },
  {
    id: 'p2', reference: 'SRV-MAINT-01', name: 'Maintenance mensuelle', description: 'Contrat de maintenance mensuelle', priceHT: 15000, vatRate: 19, unit: 'mois', category: 'Maintenance', type: 'service', stockEnabled: false, active: true, createdAt: daysAgo(195),
  },
  {
    id: 'p3', reference: 'PROD-CAM-IP', name: 'Caméra IP intérieure', description: 'Caméra IP 4MP avec vision nocturne', priceHT: 8500, vatRate: 19, unit: 'unité', category: 'Matériel', type: 'produit', stockEnabled: true, stockQuantity: 24, active: true, createdAt: daysAgo(190),
  },
  {
    id: 'p4', reference: 'PROD-NVR-01', name: 'Enregistreur NVR 8 canaux', description: 'Enregistreur réseau 8 canaux avec disque 2To', priceHT: 32000, vatRate: 19, unit: 'unité', category: 'Matériel', type: 'produit', stockEnabled: true, stockQuantity: 8, active: true, createdAt: daysAgo(185),
  },
  {
    id: 'p5', reference: 'SRV-INST-ELEC', name: 'Installation électrique', description: 'Travaux d\'installation électrique', priceHT: 45000, vatRate: 19, unit: 'forfait', category: 'Travaux', type: 'prestation', stockEnabled: false, active: true, createdAt: daysAgo(170),
  },
  {
    id: 'p6', reference: 'PROD-CABLE-01', name: 'Câble réseau CAT6 (mètre)', description: 'Câble réseau CAT6UG/GPx', priceHT: 120, vatRate: 19, unit: 'mètre', category: 'Matériel', type: 'produit', stockEnabled: true, stockQuantity: 500, active: true, createdAt: daysAgo(160),
  },
  {
    id: 'p7', reference: 'SRV-CONSULT', name: 'Consultation technique', description: 'Consultation et audit technique sur site', priceHT: 10000, vatRate: 19, unit: 'heure', category: 'Conseil', type: 'service', stockEnabled: false, active: true, createdAt: daysAgo(150),
  },
  {
    id: 'p8', reference: 'PROD-DOMO-01', name: 'Interphone vidéo', description: 'Interphone vidéo IP avec écran tactile', priceHT: 18000, vatRate: 19, unit: 'unité', category: 'Matériel', type: 'produit', stockEnabled: true, stockQuantity: 12, active: true, createdAt: daysAgo(120),
  },
  {
    id: 'p9', reference: 'SRV-FORM-01', name: 'Formation utilisateur', description: 'Formation à l\'utilisation du système (jour)', priceHT: 20000, vatRate: 19, unit: 'jour', category: 'Formation', type: 'service', stockEnabled: false, active: false, createdAt: daysAgo(90),
  },
];

const lineItem = (productId: string, designation: string, qty: number, price: number, vat: number, unit: string) => ({
  id: Math.random().toString(36).slice(2), productId, designation, quantity: qty, unitPrice: price, discount: 0, vatRate: vat, unit,
});

export const mockQuotes: Quote[] = [
  {
    id: 'q1', number: 'DEV-2026-0001', clientId: 'c1', date: daysAgo(25), expiryDate: daysFromNow(5),
    items: [
      lineItem('p1', 'Installation caméra de surveillance', 4, 25000, 19, 'unité'),
      lineItem('p3', 'Caméra IP intérieure', 4, 8500, 19, 'unité'),
      lineItem('p4', 'Enregistreur NVR 8 canaux', 1, 32000, 19, 'unité'),
    ],
    notes: 'Devis valable 30 jours', conditions: 'Paiement à 30 jours', status: 'accepte',
    createdAt: daysAgo(25), updatedAt: daysAgo(20),
  },
  {
    id: 'q2', number: 'DEV-2026-0002', clientId: 'c2', date: daysAgo(15), expiryDate: daysFromNow(15),
    items: [
      lineItem('p5', 'Installation électrique', 1, 45000, 19, 'forfait'),
      lineItem('p6', 'Câble réseau CAT6', 200, 120, 19, 'mètre'),
    ],
    notes: '', conditions: 'Paiement à 15 jours', status: 'envoye',
    createdAt: daysAgo(15), updatedAt: daysAgo(10),
  },
  {
    id: 'q3', number: 'DEV-2026-0003', clientId: 'c4', date: daysAgo(7), expiryDate: daysFromNow(23),
    items: [
      lineItem('p8', 'Interphone vidéo', 2, 18000, 19, 'unité'),
      lineItem('p1', 'Installation caméra de surveillance', 2, 25000, 19, 'unité'),
    ],
    status: 'attente', createdAt: daysAgo(7), updatedAt: daysAgo(7),
  },
  {
    id: 'q4', number: 'DEV-2026-0004', clientId: 'c6', date: daysAgo(3), expiryDate: daysFromNow(27),
    items: [
      lineItem('p2', 'Maintenance mensuelle', 12, 15000, 19, 'mois'),
      lineItem('p7', 'Consultation technique', 4, 10000, 19, 'heure'),
    ],
    status: 'brouillon', createdAt: daysAgo(3), updatedAt: daysAgo(3),
  },
  {
    id: 'q5', number: 'DEV-2025-0098', clientId: 'c3', date: daysAgo(60), expiryDate: daysAgo(30),
    items: [lineItem('p1', 'Installation caméra de surveillance', 1, 25000, 19, 'unité')],
    status: 'expire', createdAt: daysAgo(60), updatedAt: daysAgo(30),
  },
  {
    id: 'q6', number: 'DEV-2025-0095', clientId: 'c5', date: daysAgo(70), expiryDate: daysAgo(40),
    items: [lineItem('p8', 'Interphone vidéo', 1, 18000, 19, 'unité')], status: 'refuse',
    createdAt: daysAgo(70), updatedAt: daysAgo(55),
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'i1', number: 'FAC-2026-0001', clientId: 'c1', date: daysAgo(18), dueDate: daysFromNow(12),
    items: [
      lineItem('p1', 'Installation caméra de surveillance', 4, 25000, 19, 'unité'),
      lineItem('p3', 'Caméra IP intérieure', 4, 8500, 19, 'unité'),
      lineItem('p4', 'Enregistreur NVR 8 canaux', 1, 32000, 19, 'unité'),
    ],
    notes: '', conditions: 'Paiement à 30 jours', status: 'partielle', paidAmount: 80000, creditNotesApplied: 0,
    createdAt: daysAgo(18), updatedAt: daysAgo(2),
  },
  {
    id: 'i2', number: 'FAC-2026-0002', clientId: 'c2', date: daysAgo(14), dueDate: daysAgo(1),
    items: [
      lineItem('p5', 'Installation électrique', 1, 45000, 19, 'forfait'),
      lineItem('p6', 'Câble réseau CAT6', 200, 120, 19, 'mètre'),
    ],
    status: 'retard', paidAmount: 0, creditNotesApplied: 0, createdAt: daysAgo(14), updatedAt: daysAgo(14),
  },
  {
    id: 'i3', number: 'FAC-2026-0003', clientId: 'c4', date: daysAgo(10), dueDate: daysAgo(10),
    items: [
      lineItem('p8', 'Interphone vidéo', 2, 18000, 19, 'unité'),
    ],
    status: 'payee', paidAmount: 42840, creditNotesApplied: 0, createdAt: daysAgo(10), updatedAt: daysAgo(8),
  },
  {
    id: 'i4', number: 'FAC-2026-0004', clientId: 'c6', date: daysAgo(5), dueDate: daysFromNow(40),
    items: [
      lineItem('p2', 'Maintenance mensuelle', 6, 15000, 19, 'mois'),
    ],
    status: 'emise', paidAmount: 0, creditNotesApplied: 0, createdAt: daysAgo(5), updatedAt: daysAgo(5),
  },
  {
    id: 'i5', number: 'FAC-2025-0156', clientId: 'c1', date: daysAgo(50), dueDate: daysAgo(20),
    items: [
      lineItem('p7', 'Consultation technique', 5, 10000, 19, 'heure'),
      lineItem('p2', 'Maintenance mensuelle', 1, 15000, 19, 'mois'),
    ],
    status: 'payee', paidAmount: 89025, creditNotesApplied: 0, createdAt: daysAgo(50), updatedAt: daysAgo(35),
  },
  {
    id: 'i6', number: 'FAC-2025-0150', clientId: 'c3', date: daysAgo(80), dueDate: daysAgo(50),
    items: [lineItem('p1', 'Installation caméra de surveillance', 1, 25000, 19, 'unité')],
    status: 'payee', paidAmount: 29750, creditNotesApplied: 0, createdAt: daysAgo(80), updatedAt: daysAgo(70),
  },
  {
    id: 'i7', number: 'FAC-2026-0005', clientId: 'c7', date: daysAgo(2), dueDate: daysFromNow(28),
    items: [lineItem('p1', 'Installation caméra de surveillance', 1, 25000, 19, 'unité')],
    status: 'brouillon', paidAmount: 0, creditNotesApplied: 0, createdAt: daysAgo(2), updatedAt: daysAgo(2),
  },
  {
    id: 'i8', number: 'FAC-2025-0148', clientId: 'c6', date: daysAgo(100), dueDate: daysAgo(70),
    items: [
      lineItem('p4', 'Enregistreur NVR 8 canaux', 2, 32000, 19, 'unité'),
      lineItem('p3', 'Caméra IP intérieure', 8, 8500, 19, 'unité'),
    ],
    status: 'payee', paidAmount: 152488, creditNotesApplied: 0, createdAt: daysAgo(100), updatedAt: daysAgo(85),
  },
];

export const mockCreditNotes: CreditNote[] = [
  {
    id: 'cn1', number: 'AV-2026-0001', clientId: 'c1', invoiceId: 'i1', invoiceNumber: 'FAC-2026-0001',
    date: daysAgo(3),
    items: [lineItem('p3', 'Caméra IP intérieure (retour)', 1, 8500, 19, 'unité')],
    reason: 'Retour matériel défectueux',
    notes: 'Avoir suite à retour d\'une caméra défectueuse',
    status: 'emis', appliedAmount: 0, createdAt: daysAgo(3), updatedAt: daysAgo(3),
  },
  {
    id: 'cn2', number: 'AV-2026-0002', clientId: 'c4', invoiceId: 'i3', invoiceNumber: 'FAC-2026-0003',
    date: daysAgo(5),
    items: [lineItem('p8', 'Interphone vidéo (erreur facturation)', 1, 18000, 19, 'unité')],
    reason: 'Erreur de facturation',
    notes: 'Un interphone facturé en trop',
    status: 'applique', appliedAmount: 21420, createdAt: daysAgo(5), updatedAt: daysAgo(4),
  },
  {
    id: 'cn3', number: 'AV-2026-0003', clientId: 'c6', invoiceId: 'i4', invoiceNumber: 'FAC-2026-0004',
    date: daysAgo(1),
    items: [lineItem('p2', 'Maintenance mensuelle (remise commerciale)', 1, 15000, 19, 'mois')],
    reason: 'Remise commerciale',
    notes: 'Geste commercial pour retard d\'installation',
    status: 'brouillon', appliedAmount: 0, createdAt: daysAgo(1), updatedAt: daysAgo(1),
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay1', number: 'PAY-2026-0001', invoiceId: 'i1', clientId: 'c1', amount: 80000, date: daysAgo(5),
    method: 'virement', reference: 'VIR-2026-005', note: 'Acompte', createdAt: daysAgo(5),
  },
  {
    id: 'pay2', number: 'PAY-2026-0002', invoiceId: 'i3', clientId: 'c4', amount: 42840, date: daysAgo(8),
    method: 'especes', createdAt: daysAgo(8),
  },
  {
    id: 'pay3', number: 'PAY-2025-0089', invoiceId: 'i5', clientId: 'c1', amount: 89025, date: daysAgo(35),
    method: 'cheque', reference: 'CHQ-00451', createdAt: daysAgo(35),
  },
  {
    id: 'pay4', number: 'PAY-2025-0085', invoiceId: 'i6', clientId: 'c3', amount: 29750, date: daysAgo(70),
    method: 'especes', createdAt: daysAgo(70),
  },
  {
    id: 'pay5', number: 'PAY-2025-0080', invoiceId: 'i8', clientId: 'c6', amount: 152488, date: daysAgo(85),
    method: 'virement', reference: 'VIR-2025-120', createdAt: daysAgo(85),
  },
];

export const mockSuppliers: Supplier[] = [
  {
    id: 's1', name: 'TechSupply Algérie', phone: '021 50 60 70', email: 'ventes@techsupply.dz',
    address: 'Zone industrielle Oued Smar, Alger', nif: '000016004567890', notes: 'Fournisseur matériel',
    createdAt: daysAgo(200),
  },
  {
    id: 's2', name: 'ElectroPro Distribution', phone: '041 22 33 44', email: 'info@electropro.dz',
    address: '23 Boulevard de la Soummam, Oran', nif: '000031005678901', createdAt: daysAgo(150),
  },
  {
    id: 's3', name: 'Ooredoo Entreprise', phone: '021 90 80 70', email: 'entreprise@ooredoo.dz',
    address: '1 Boulevard des Martyrs, Alger', createdAt: daysAgo(180),
  },
  {
    id: 's4', name: 'Bureaux Pro', phone: '025 40 50 60', email: 'contact@bureauxpro.dz',
    address: '15 Rue de la Liberté, Blida', createdAt: daysAgo(120),
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1', date: daysAgo(3), supplierId: 's1', supplierName: 'TechSupply Algérie', category: 'equipement',
    description: 'Achat caméras IP lot', amountHT: 68000, vatRate: 19, amountTTC: 80920, method: 'virement',
    note: 'Réapprovisionnement', createdAt: daysAgo(3),
  },
  {
    id: 'e2', date: daysAgo(7), supplierId: 's3', supplierName: 'Ooredoo Entreprise', category: 'telecommunication',
    description: 'Forfait internet entreprise', amountHT: 4500, vatRate: 19, amountTTC: 5355, method: 'carte',
    createdAt: daysAgo(7),
  },
  {
    id: 'e3', date: daysAgo(15), supplierId: '', supplierName: 'SCIE', category: 'loyer',
    description: 'Loyer atelier octobre', amountHT: 35000, vatRate: 0, amountTTC: 35000, method: 'virement',
    createdAt: daysAgo(15),
  },
  {
    id: 'e4', date: daysAgo(20), supplierId: 's4', supplierName: 'Bureaux Pro', category: 'fournitures',
    description: 'Fournitures de bureau', amountHT: 8500, vatRate: 19, amountTTC: 10115, method: 'especes',
    createdAt: daysAgo(20),
  },
  {
    id: 'e5', date: daysAgo(25), supplierId: '', supplierName: 'Station Total', category: 'transport',
    description: 'Carburant véhicule', amountHT: 12000, vatRate: 19, amountTTC: 14280, method: 'carte',
    createdAt: daysAgo(25),
  },
  {
    id: 'e6', date: daysAgo(30), supplierId: '', supplierName: 'Adobe', category: 'logiciels',
    description: 'Abonnement Creative Cloud', amountHT: 5200, vatRate: 19, amountTTC: 6188, method: 'en_ligne',
    createdAt: daysAgo(30),
  },
];

export const mockUsers: User[] = [
  {
    id: 'u1', name: 'Administrateur', email: 'admin@factura.dz', role: 'admin', active: true,
    lastLoginAt: daysAgo(0), createdAt: daysAgo(300),
  },
  {
    id: 'u2', name: 'Jean Dupont', email: 'jean@factura.dz', role: 'commercial', active: true,
    permissions: {
      clients: { view: true, create: true, edit: true, delete: false },
      quotes: { view: true, create: true, edit: true, delete: false },
      invoices: { view: true, create: true, edit: true, delete: false },
      payments: { view: true, create: true, edit: false, delete: false },
      products: { view: true, create: true, edit: true, delete: false },
    },
    lastLoginAt: daysAgo(1), createdAt: daysAgo(120),
  },
  {
    id: 'u3', name: 'Sofiane Mokrani', email: 'sofiane@factura.dz', role: 'comptable', active: false,
    permissions: {
      invoices: { view: true, create: true, edit: true, delete: false },
      payments: { view: true, create: true, edit: true, delete: true },
      expenses: { view: true, create: true, edit: true, delete: true },
      suppliers: { view: true, create: true, edit: true, delete: false },
      reports: { view: true },
    },
    lastLoginAt: daysAgo(45), createdAt: daysAgo(90),
  },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: 'a1', userId: 'u1', userName: 'Administrateur', action: 'a créé', entity: 'Facture', entityId: 'i7', details: 'FAC-2026-0005', timestamp: daysAgo(2) },
  { id: 'a2', userId: 'u2', userName: 'Jean Dupont', action: 'a enregistré un paiement de', entity: 'Paiement', entityId: 'pay1', details: '80 000 DA', timestamp: daysAgo(5) },
  { id: 'a3', userId: 'u1', userName: 'Administrateur', action: 'a accepté le devis', entity: 'Devis', entityId: 'q1', details: 'DEV-2026-0001', timestamp: daysAgo(20) },
  { id: 'a4', userId: 'u2', userName: 'Jean Dupont', action: 'a ajouté le client', entity: 'Client', entityId: 'c8', details: 'Karim Cherif', timestamp: daysAgo(45) },
  { id: 'a5', userId: 'u1', userName: 'Administrateur', action: 'a modifié les paramètres', entity: 'Paramètres', timestamp: daysAgo(8) },
  { id: 'a6', userId: 'u2', userName: 'Jean Dupont', action: 'a enregistré une dépense de', entity: 'Dépense', entityId: 'e2', details: '5 355 DA', timestamp: daysAgo(7) },
];

export const mockBackups: BackupRecord[] = [
  { id: 'b1', date: daysAgo(0), type: 'automatique', size: '2.4 Mo', location: 'C:\\Factura\\backups\\' },
  { id: 'b2', date: daysAgo(1), type: 'automatique', size: '2.3 Mo', location: 'C:\\Factura\\backups\\' },
  { id: 'b3', date: daysAgo(3), type: 'manuel', size: '2.2 Mo', location: 'D:\\Sauvegardes\\' },
  { id: 'b4', date: daysAgo(7), type: 'automatique', size: '2.0 Mo', location: 'C:\\Factura\\backups\\' },
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1', type: 'warning', title: 'Facture en retard', message: 'FAC-2026-0002 (BTP Sahara) a dépassé son échéance',
    read: false, timestamp: daysAgo(1), actionLabel: 'Voir la facture', actionRoute: '/invoices/i2',
  },
  {
    id: 'n2', type: 'info', title: 'Devis expiré', message: 'DEV-2025-0098 a expiré',
    read: false, timestamp: daysAgo(2), actionRoute: '/quotes',
  },
  {
    id: 'n3', type: 'success', title: 'Sauvegarde réussie', message: 'Sauvegarde automatique effectuée à 04:30',
    read: true, timestamp: daysAgo(0),
  },
  {
    id: 'n4', type: 'warning', title: 'Facture à échéance', message: 'FAC-2026-0001 arrive à échéance dans 12 jours',
    read: true, timestamp: daysAgo(3), actionRoute: '/invoices/i1',
  },
];

export const defaultDocumentFields: DocumentFieldsSettings = {
  invoice: {
    fields: [
      { key: 'client', label: 'Client', enabled: true, required: true },
      { key: 'date', label: 'Date', enabled: true, required: true },
      { key: 'dueDate', label: 'Échéance', enabled: true, required: true },
      { key: 'items', label: 'Lignes', enabled: true, required: true },
      { key: 'notes', label: 'Notes', enabled: true, required: false },
      { key: 'conditions', label: 'Conditions', enabled: true, required: false },
      { key: 'discount', label: 'Remise', enabled: false, required: false },
      { key: 'paymentRef', label: 'Référence paiement', enabled: false, required: false },
    ],
    units: ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait', 'kg', 'litre', 'lot'],
  },
  quote: {
    fields: [
      { key: 'client', label: 'Client', enabled: true, required: true },
      { key: 'date', label: 'Date', enabled: true, required: true },
      { key: 'expiryDate', label: 'Validité', enabled: true, required: true },
      { key: 'items', label: 'Lignes', enabled: true, required: true },
      { key: 'notes', label: 'Notes', enabled: true, required: false },
      { key: 'conditions', label: 'Conditions', enabled: true, required: false },
      { key: 'discount', label: 'Remise', enabled: false, required: false },
    ],
    units: ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait', 'kg', 'litre', 'lot'],
  },
  creditNote: {
    reasons: [
      'Retour matériel',
      'Erreur de facturation',
      'Remise commerciale',
      'Annulation partielle',
      'Annulation totale',
      'Produit défectueux',
      'Autre',
    ],
    units: ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait', 'kg', 'litre', 'lot'],
  },
};

export const defaultExpenseCategories: ExpenseCategoryConfig[] = [
  { id: 'ec1', name: 'Fournitures', color: '#3b82f6' },
  { id: 'ec2', name: 'Transport', color: '#10b981' },
  { id: 'ec3', name: 'Télécommunication', color: '#f59e0b' },
  { id: 'ec4', name: 'Loyer', color: '#ef4444' },
  { id: 'ec5', name: 'Équipement', color: '#8b5cf6' },
  { id: 'ec6', name: 'Logiciels', color: '#06b6d4' },
  { id: 'ec7', name: 'Autre', color: '#6b7280' },
];

export const defaultSettings: Settings = {
  company: {
    name: 'SecurPro Solutions',
    address: '15 Zone d\'activité, Rouiba, Alger',
    phone: '021 82 45 67',
    email: 'contact@securpro.dz',
    nif: '000016001234567',
    nis: '098765432101234',
    rc: '16/00-1234567',
    ai: '16001234',
    bankDetails: 'BNA Agence Rouiba - RIB: 004 00047 0001234567 89',
  },
  numbering: {
    invoicePrefix: 'FAC', invoiceStart: 1, invoicePad: 4,
    quotePrefix: 'DEV', quoteStart: 1, quotePad: 4,
    creditNotePrefix: 'AV', creditNoteStart: 1, creditNotePad: 4,
    useYear: true,
  },
  defaultVatRate: 19,
  currency: 'DA',
  defaultPaymentDelay: 30,
  defaultQuoteValidity: 30,
  paymentMethods: ['especes', 'virement', 'carte', 'cheque', 'en_ligne', 'autre'],
  invoiceTemplate: 'moderne',
  quoteTemplate: 'moderne',
  footer: 'Merci de votre confiance',
  terms: 'Paiement à 30 jours. Aucun retour accepté après 7 jours.',
  language: 'fr',
  theme: 'system',
  productCategories: mockProductCategories,
  clientGroups: mockClientGroups,
  documentFields: defaultDocumentFields,
  expenseCategories: defaultExpenseCategories,
  smtp: {
    host: '',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    encryption: 'tls',
    enabled: false,
  },
  emailTemplates: {
    invoiceSent: {
      subject: 'Facture {{number}} de {{companyName}}',
      body: 'Bonjour {{clientName}},\n\nVeuillez trouver ci-joint la facture {{number}} d\'un montant de {{amount}}.\nDate d\'échéance : {{dueDate}}.\n\nMerci de votre confiance.\n{{companyName}}',
      enabled: true,
    },
    invoiceReminder: {
      subject: 'Rappel : Facture {{number}} en attente de paiement',
      body: 'Bonjour {{clientName}},\n\nNous vous rappelons que la facture {{number}} d\'un montant de {{amount}} arrive à échéance le {{dueDate}}.\n\nMerci de procéder au règlement dans les meilleurs délais.\n{{companyName}}',
      enabled: true,
    },
    quoteSent: {
      subject: 'Devis {{number}} de {{companyName}}',
      body: 'Bonjour {{clientName}},\n\nVeuillez trouver ci-joint notre devis {{number}} d\'un montant de {{amount}}.\nCe devis est valable jusqu\'au {{expiryDate}}.\n\nNous restons à votre disposition pour toute question.\n{{companyName}}',
      enabled: true,
    },
    paymentReceived: {
      subject: 'Confirmation de paiement - {{number}}',
      body: 'Bonjour {{clientName}},\n\nNous accusons réception de votre paiement de {{amount}} concernant la facture {{number}}.\n\nMerci pour votre confiance.\n{{companyName}}',
      enabled: true,
    },
    creditNoteIssued: {
      subject: 'Avoir {{number}} de {{companyName}}',
      body: 'Bonjour {{clientName}},\n\nNous vous informons qu\'un avoir {{number}} d\'un montant de {{amount}} a été émis suite à : {{reason}}.\n\nCet avoir est rattaché à la facture {{invoiceNumber}}.\n{{companyName}}',
      enabled: true,
    },
    paymentOverdue: {
      subject: 'URGENT : Facture {{number}} en retard de paiement',
      body: 'Bonjour {{clientName}},\n\nMalgré nos précédents rappels, la facture {{number}} d\'un montant de {{amount}} reste impayée. Elle était due le {{dueDate}}.\n\nNous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais.\n\nCordialement,\n{{companyName}}',
      enabled: true,
    },
  },
};
