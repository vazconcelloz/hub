INSERT INTO public.user_roles (user_id, role)
SELECT '22b55a86-6ca7-4e1a-b520-7dba1bfc95c5', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '22b55a86-6ca7-4e1a-b520-7dba1bfc95c5' AND role = 'admin'::app_role
);