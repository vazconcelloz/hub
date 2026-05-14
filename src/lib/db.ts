import { api, API_URL } from '@/lib/api';

// Magic proxy that converts DB calls to our Express + Prisma backend
export const db = {
  auth: {
    getUser: () => api.auth.getUser(),
    getSession: () => api.auth.getSession(),
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => api.auth.onAuthStateChange(cb),
    signOut: () => api.auth.signOut(),
    signInWithPassword: async ({ email, password }: Record<string, string>) => {
      try {
        const res = await api.fetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('hub_token', res.token);
        return { data: { user: res.user }, error: null };
      } catch (err: unknown) {
        return { data: null, error: err };
      }
    },
    signUp: async ({ email, password }: Record<string, string>) => {
      try {
        const res = await api.fetch('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('hub_token', res.token);
        return { data: { user: res.user }, error: null };
      } catch (err: unknown) {
        return { data: null, error: err };
      }
    },
    signInWithOAuth: async () => {
      return { data: null, error: new Error('Google Auth desativado. Use email/senha.') };
    }
  },
  
  from: (table: string) => {
    const queryArgs: Record<string, unknown> = { where: {}, orderBy: [] };
    
    // Convert field names to snake_case to match Prisma if necessary, or just rely on Prisma
    
    const builder: Record<string, unknown> = {
      select: (_fields: string) => { 
        // Ignore fields for now, just fetch all to be safe, Prisma does it fast enough locally
        return builder; 
      },
      eq: (field: string, val: unknown) => { 
        (queryArgs.where as Record<string, unknown>)[field] = val; 
        return builder; 
      },
      neq: (field: string, val: unknown) => { 
        (queryArgs.where as Record<string, unknown>)[field] = { not: val }; 
        return builder; 
      },
      in: (field: string, vals: unknown[]) => { 
        (queryArgs.where as Record<string, unknown>)[field] = { in: vals }; 
        return builder; 
      },
      order: (field: string, opts?: { ascending?: boolean }) => { 
        (queryArgs.orderBy as Record<string, unknown>[]).push({ [field]: opts?.ascending === false ? 'desc' : 'asc' }); 
        return builder; 
      },
      single: async () => {
        try {
          const res = await api.fetch('/db/query', { method: 'POST', body: JSON.stringify({ table, action: 'findFirst', args: queryArgs }) });
          return { data: res.data, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      maybeSingle: async () => {
        try {
          const res = await api.fetch('/db/query', { method: 'POST', body: JSON.stringify({ table, action: 'findFirst', args: queryArgs }) });
          return { data: res.data || null, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
      insert: (data: unknown) => {
        const insertBuilder = {
          select: () => insertBuilder,
          single: async () => {
            try {
              const isArray = Array.isArray(data);
              const action = isArray ? 'createMany' : 'create';
              const res = await api.fetch('/db/query', { 
                method: 'POST', 
                body: JSON.stringify({ table, action, args: isArray ? { data, skipDuplicates: true } : { data } }) 
              });
              
              // Se for array (createMany), o Prisma retorna { count: N }. 
              // Para não quebrar o frontend que espera os registros, retornamos o próprio dado enviado 
              // se o resultado não contiver os registros (o que é o caso do createMany).
              let returnData = res.data;
              if (isArray && res.data && typeof res.data.count === 'number') {
                returnData = data;
              }
              
              return { data: returnData || data, error: null };
            } catch (err) {
              console.error(`Insert error on ${table}:`, err);
              return { data: null, error: err };
            }
          },
          then: (resolve: (v: any) => void) => {
            insertBuilder.single().then(resolve);
          }
        };
        return insertBuilder;
      },
      update: (data: unknown) => {
        queryArgs.data = data;
        return {
          eq: async (field: string, val: unknown) => {
            try {
              (queryArgs.where as Record<string, unknown>)[field] = val;
              // Remove orderBy from updateMany as Prisma doesn't support it
              const { orderBy, ...cleanArgs } = queryArgs;
              const res = await api.fetch('/db/query', { 
                method: 'POST', 
                body: JSON.stringify({ table, action: 'updateMany', args: cleanArgs }) 
              });
              return { data: res.data, error: null };
            } catch (err) {
              return { data: null, error: err };
            }
          }
        };
      },
      delete: () => {
        return {
          eq: async (field: string, val: unknown) => {
            try {
              (queryArgs.where as Record<string, unknown>)[field] = val;
              // Remove orderBy from deleteMany as Prisma doesn't support it
              const { orderBy, ...cleanArgs } = queryArgs;
              const res = await api.fetch('/db/query', { 
                method: 'POST', 
                body: JSON.stringify({ table, action: 'deleteMany', args: cleanArgs }) 
              });
              return { data: res.data, error: null };
            } catch (err) {
              return { data: null, error: err };
            }
          }
        };
      },
      // Thenable to allow `await db.from().select()`
      then: (resolve: (value: unknown) => void, _reject: (reason?: unknown) => void) => {
        api.fetch('/db/query', { method: 'POST', body: JSON.stringify({ table, action: 'findMany', args: queryArgs }) })
          .then(res => resolve({ data: res.data, error: null }))
          .catch(err => resolve({ data: null, error: err }));
      }
    };
    return builder;
  },

  // Mock functions/storage to avoid crashes before we implement them completely
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob) => {
        try {
          const formData = new FormData();
          formData.append('path', path);
          formData.append('file', file);
          
          const token = localStorage.getItem('hub_token');
          const res = await fetch(`${API_URL}/storage/upload/${bucket}`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
          });
          
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Falha no upload');
          }
          const json = await res.json();
          return { data: { path: json.path }, error: null };
        } catch (err: unknown) {
          return { data: null, error: err };
        }
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${API_URL.replace('/api', '')}/uploads/${bucket}/${path}` } }),
      createSignedUrl: async (path: string) => ({ data: { signedUrl: `${API_URL.replace('/api', '')}/uploads/${bucket}/${path}` }, error: null })
    })
  },
  
  functions: {
    invoke: async (func: string, args: Record<string, unknown>) => {
      try {
        const token = localStorage.getItem('hub_token');
        const res = await fetch(`${API_URL}/functions/invoke/${func}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(args.body || {})
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erro na função ${func}`);
        }
        
        const json = await res.json();
        return { data: json, error: null };
      } catch (err: unknown) {
        return { data: null, error: err };
      }
    }
  }
};
