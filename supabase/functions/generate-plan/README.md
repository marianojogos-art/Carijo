# Geração segura de planejamentos

Esta função é chamada somente por professores autenticados. Antes de publicar:

1. A tabela `teacher_plans` já deve ter os campos `class_id`, `class_name`, `subject`, `plan_type`, `title`, `period_label`, `plan_data` e `document_html`.
2. Em Edge Functions > Secrets, crie `OPENAI_API_KEY` e defina `OPENAI_MODEL` como `gpt-5.6-luna`.
3. Publique a função com o nome `generate-plan` e mantenha a verificação de JWT habilitada.

Nunca coloque a chave OpenAI no `app.js`, no ZIP portátil ou no painel público do Cloudflare.
