INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.email = 'admin@grupofbn.com.br'
ON CONFLICT (user_id, role) DO NOTHING;