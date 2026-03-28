import { 
  db, 
  auth, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  runTransaction
} from '../firebase';
import { Product, Sale, Expense, Income, AppState, UserSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // Settings
  subscribeSettings: (callback: (settings: UserSettings) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    
    const docRef = doc(db, 'settings', uid);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserSettings);
      } else {
        // Default settings
        const defaultSettings: UserSettings = {
          productCategories: ['Polos', 'Poleras', 'Pantalones', 'Accesorios', 'Otros'],
          expenseCategories: ['Producción', 'Publicidad', 'Envíos', 'Materiales', 'Otros'],
          incomeCategories: ['Ventas Extra', 'Inversión', 'Devoluciones', 'Otros']
        };
        setDoc(docRef, defaultSettings);
        callback(defaultSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `settings/${uid}`));
  },

  updateSettings: async (settings: UserSettings) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await setDoc(doc(db, 'settings', uid), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `settings/${uid}`);
    }
  },

  // Products
  subscribeProducts: (callback: (products: Product[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    
    const q = query(collection(db, 'products'), where('ownerUid', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => doc.data() as Product);
      callback(products);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));
  },

  addProduct: async (product: Product) => {
    try {
      await setDoc(doc(db, 'products', product.id), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
    }
  },

  updateProduct: async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { ...product });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  },

  deleteProduct: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  },

  // Sales
  subscribeSales: (callback: (sales: Sale[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    
    const q = query(collection(db, 'sales'), where('ownerUid', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => doc.data() as Sale);
      callback(sales);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sales'));
  },

  addSale: async (sale: Sale) => {
    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', sale.productId);
        const productSnap = await transaction.get(productRef);
        
        if (!productSnap.exists()) {
          throw new Error('El producto no existe.');
        }

        const product = productSnap.data() as Product;
        const variantIndex = product.variants.findIndex(v => v.id === sale.variantId);
        
        if (variantIndex === -1) {
          throw new Error('La variante no existe.');
        }

        if (product.variants[variantIndex].stock < sale.quantity) {
          throw new Error('Stock insuficiente.');
        }

        // Update variants
        const updatedVariants = [...product.variants];
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          stock: updatedVariants[variantIndex].stock - sale.quantity
        };

        // Add sale
        const saleRef = doc(db, 'sales', sale.id);
        transaction.set(saleRef, sale);
        
        // Update product stock
        transaction.update(productRef, { variants: updatedVariants });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.TRANSACTION, `sales/${sale.id}`);
    }
  },

  // Expenses
  subscribeExpenses: (callback: (expenses: Expense[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    
    const q = query(collection(db, 'expenses'), where('ownerUid', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => doc.data() as Expense);
      callback(expenses);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));
  },

  addExpense: async (expense: Expense) => {
    try {
      await setDoc(doc(db, 'expenses', expense.id), expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `expenses/${expense.id}`);
    }
  },

  deleteExpense: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  },

  // Incomes
  subscribeIncomes: (callback: (incomes: Income[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    
    const q = query(collection(db, 'incomes'), where('ownerUid', '==', uid));
    return onSnapshot(q, (snapshot) => {
      const incomes = snapshot.docs.map(doc => doc.data() as Income);
      callback(incomes);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'incomes'));
  },

  addIncome: async (income: Income) => {
    try {
      await setDoc(doc(db, 'incomes', income.id), income);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `incomes/${income.id}`);
    }
  },

  deleteIncome: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'incomes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `incomes/${id}`);
    }
  },

  getUserProfile: async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      return null;
    }
  },

  updateUserProfile: async (profile: any) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const updatedProfile = {
        ...profile,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  },
  
  resetUserData: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    try {
      const collections = ['products', 'sales', 'expenses', 'incomes'];
      
      for (const collName of collections) {
        const q = query(collection(db, collName), where('ownerUid', '==', uid));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'all_user_data');
    }
  }
};
