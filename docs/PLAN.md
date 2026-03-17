# Sistema de Monitoramento de Métricas para Artistas - Plano

## Contexto
Sistema completo de monitoramento de métricas para artistas musicais (MVP v1). Centraliza métricas do YouTube, Instagram e Spotify, oferece recomendações de marketing via GPT-4o, e ajuda artistas a alavancar suas carreiras através de dados.

## Stack
- Next.js 16 (App Router) + TypeScript + pnpm
- Prisma 6 + NeonDB (PostgreSQL)
- TailwindCSS + **shadcn/ui** (uso extensivo de todos os componentes) + Framer Motion + Recharts
- OpenAI GPT-4o via **Responses API** (SDK v6.x)
- Deploy na Vercel

## Arquitetura
- Modo artista único (sem login)
- OAuth para conexão de plataformas
- Prints enviados **direto ao GPT-4o via base64** (sem armazenamento em cloud)
- UI construída extensivamente com shadcn/ui (Card, Dialog, Sheet, Table, Tabs, Badge, Avatar, Skeleton, Toast, Command, etc.)

## Fases

### Fase 1: Base
1. Criar projeto Next.js 16 com pnpm
2. Instalar e configurar shadcn/ui com todos os componentes necessários
3. Schema Prisma + NeonDB + migrations + seed
4. Shell do app com Sidebar (Sheet no mobile), Header, navegação

### Fase 2: OAuth + Conexões
5. OAuth YouTube, Instagram, Spotify
6. Página de conexões com Cards de status por plataforma

### Fase 3: Coleta de Métricas
7. Wrappers de API das plataformas
8. Orquestrador sequencial + SSE para status em tempo real
9. Página com botão "Atualizar Métricas"

### Fase 4: Dashboard + Visualização
10. Dashboard com Cards de KPI, gráficos Recharts, comparação entre plataformas
11. Ranking de conteúdo com Table/DataTable do shadcn
12. Audiência com gráficos de demografia

### Fase 5: Upload Manual de Prints
13. Upload de screenshot → converte para base64 → envia direto ao GPT-4o (`input_image`)
14. GPT extrai métricas do print automaticamente
15. Dados extraídos salvos no banco (ManualMetrics)
16. Sem necessidade de armazenamento de imagem em cloud

### Fase 6: Chat de IA
17. Responses API com streaming
18. Prompt dinâmico com métricas + `instructions`
19. Auto-pesquisa do artista ao conectar YouTube
20. Chat UI com Command palette para prompts sugeridos

### Fase 7: Finalização
21. Skeletons, error boundaries, responsividade total
22. Repo GitHub + deploy Vercel

## Componentes shadcn/ui planejados
Card, Button, Badge, Avatar, Skeleton, Table, Tabs, Sheet, Dialog, Command, Input, Textarea, Select, DropdownMenu, Separator, Toast/Sonner, Progress, Tooltip, ScrollArea, Alert, Chart

## Variáveis de Ambiente
DATABASE_URL, DIRECT_DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, OPENAI_API_KEY, NEXT_PUBLIC_APP_URL, ENCRYPTION_KEY
