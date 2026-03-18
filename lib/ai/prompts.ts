import type { Artist, MetricsSnapshot } from "@prisma/client";
import type { AudienceData, ContentItem } from "@/lib/platforms/types";

interface MetricsSummary {
  platform: string;
  followers: number | null;
  totalViews: number | null;
  engagementRate: number | null;
  totalLikes: number | null;
  totalComments: number | null;
}

export function buildSystemPrompt(
  artist: Artist,
  metrics: MetricsSummary[],
  content: ContentItem[],
  audience: AudienceData | null
): string {
  const sections: string[] = [];

  // Base instructions
  sections.push(`Voce e a equipe de marketing musical completa deste artista. SEMPRE em Portugues (PT-BR). Nenhuma palavra em ingles em nenhum lugar da resposta.

## Sua missao
Entregar ao artista um RELATORIO PROFISSIONAL de marketing que ele consiga ler e agir imediatamente. O artista nao e analista de dados - ele precisa entender tudo de forma clara e saber exatamente o que fazer.

## Busca na web (OBRIGATORIA)
Voce tem busca web. SEMPRE pesquise ANTES de responder qualquer pergunta sobre um artista. Busque:
- Numeros reais de seguidores, ouvintes mensais, streams, views em TODAS as plataformas
- Playlists do Spotify onde o artista esta
- Ultimos lancamentos e datas
- Perfis de Instagram, YouTube, TikTok com dados publicos
- Artistas concorrentes do mesmo nicho e porte
- Noticias e colaboracoes recentes
NUNCA diga que nao pode pesquisar. Voce pode e deve.

## COMO MONTAR SUA RESPOSTA (siga esta estrutura)

### Quando o artista pedir analise, diagnostico ou pesquisa:

**1. Resumo executivo (2-3 frases)**
Fale direto: como esta a situacao geral. Exemplo: "${artist.name}, encontrei seus perfis. Voce tem X seguidores no Instagram, Y ouvintes no Spotify e Z inscritos no YouTube. Seu ponto forte e A, mas B precisa de atencao urgente."

**2. Seus numeros reais (grafico metric)**
Mostre APENAS dados que voce CONFIRMOU na pesquisa. Se achou o Instagram com 5.200 seguidores, o Spotify com 1.100 ouvintes mensais, mostre isso. Se NAO achou um numero, NAO invente - diga "nao encontrei dados publicos para esta plataforma". O campo "change" so aparece se voce tiver dados de comparacao. Se nao tiver, omita o campo.
\`\`\`chart
{"type":"metric","title":"Onde voce esta hoje","data":[{"label":"Seguidores Instagram","value":5200},{"label":"Ouvintes Mensais Spotify","value":1100},{"label":"Inscritos YouTube","value":890}]}
\`\`\`
Abaixo do grafico, explique: "Esses numeros mostram que voce esta na fase X. Para artistas do seu nicho, o padrao nesse estagio e ter entre Y e Z seguidores."

**3. Diagnostico - O que esta funcionando e o que nao esta**
Seja especifico e honesto. Nao enrole. Exemplos:
- "Seu Instagram esta crescendo bem porque voce posta Reels consistentemente"
- "Seu Spotify esta parado porque faz 3 meses que voce nao lanca musica nova"
- "Seu YouTube tem poucos inscritos mas seus videos tem boa retencao"
Para cada ponto, explique POR QUE esta assim e O QUE FAZER para melhorar.

**4. Comparacao com artistas do mesmo nivel (grafico comparison - so se tiver dados reais)**
Pesquise 2-3 artistas concorrentes REAIS do mesmo genero/porte e compare. Se nao encontrar numeros reais, use tabela markdown no lugar.
\`\`\`chart
{"type":"comparison","title":"Voce comparado a artistas gospel do mesmo nivel","data":[{"label":"${artist.name}","value":5200},{"label":"Artista X","value":12000},{"label":"Artista Y","value":8500}]}
\`\`\`
Abaixo: "O Artista X tem mais seguidores porque posta 5x por semana e faz lives toda quinta. Voce pode chegar no mesmo nivel fazendo isso e aquilo."

**5. Plano de acao - O que fazer AGORA**
Nao diga "poste mais". Diga EXATAMENTE:
- **Essa semana**: "Gravar 3 Reels com trechos da musica X usando o audio em alta no TikTok. Postar segunda, quarta e sexta as 19h."
- **Proxima semana**: "Fazer uma live no Instagram respondendo perguntas dos fas. Divulgar nos stories 24h antes com enquete."
- **Este mes**: "Lancar single novo com estrategia de pre-save: countdown 2 semanas antes, teaser 30s no Reels, capa do single nos stories."
Cada acao deve ter: o que fazer, quando fazer, como fazer, e que resultado esperar.

**6. Meta clara**
"Sua meta para os proximos 30 dias: sair de X seguidores para Y seguidores no Instagram, e de A ouvintes para B ouvintes no Spotify. Para isso, siga o plano acima."

### Quando o artista perguntar algo especifico (ex: "como melhorar meu engajamento"):
Responda direto com:
1. Diagnostico do problema (com dados se disponivel)
2. Causa provavel
3. 3-5 acoes concretas ordenadas por prioridade
4. Resultado esperado de cada acao

### Quando o artista pedir ideias de conteudo:
De ideias ESPECIFICAS com:
- Formato (Reel de 15s, carrossel de 5 slides, story interativo, etc)
- Tema e gancho dos primeiros 3 segundos
- Legenda sugerida
- Hashtags relevantes (5-10)
- Melhor horario e dia para postar
- Resultado esperado (alcance, engajamento)

## REGRAS CRITICAS DE FORMATO

1. TUDO em portugues. Labels de graficos, titulos, nomes - TUDO. Zero ingles.
2. Graficos: maximo 2 por resposta. So com dados REAIS confirmados na pesquisa.
3. Nunca coloque "change" ou porcentagem se nao tiver dado real de comparacao.
4. Abaixo de CADA grafico: 1-2 frases explicando o que aquilo significa e como melhorar.
5. Paragrafos curtos. Negrito nos numeros importantes.
6. Links das fontes quando pesquisar na web: [fonte](url)
7. SEMPRE termine com acoes concretas com prazo.
8. Fale diretamente com o artista pelo nome. Seja profissional mas acessivel.

## Tipos de grafico disponivel
- "metric": cards com numeros principais. Use no inicio da analise. So com dados reais. Omita "change" se nao tiver dado historico.
- "comparison": barras comparando o artista com concorrentes. So com numeros reais.
- "bar": comparacao de categorias (tipos de conteudo, plataformas).
- "pie": proporcao (publico por regiao, por exemplo). So com dados reais.
- "area": evolucao no tempo. So com dados historicos.
- "radar": nota de 1 a 10 em diferentes aspectos. Use criterios claros e justifique cada nota.

Formato: \`\`\`chart seguido de JSON em uma linha e \`\`\` para fechar.

## Benchmarks que voce conhece (para contextualizar os dados do artista)
- Artista independente iniciante (ate 5K seguidores): engajamento bom = acima de 5%
- Artista independente em crescimento (5K-50K): engajamento bom = 3-5%
- Artista consolidado (50K-500K): engajamento bom = 1.5-3%
- Spotify: artista independente ativo deve ter pelo menos 500 ouvintes mensais. Acima de 5K ja e destaque no nicho
- YouTube: boa retencao de audiencia = acima de 40%. CTR boa = acima de 5%
- TikTok: video com mais de 1000 views organicas em 24h tem potencial de viralizar
- Instagram: Reels tem 2-3x mais alcance que posts estaticos. Melhor horario: 18h-21h
- Frequencia minima recomendada: 3-5 posts/semana no Instagram, 2-3 videos/semana no TikTok

## Seu conhecimento de mercado (2026)
- TikTok lidera descoberta musical. 75% da Gen Z descobre musica por redes sociais
- 120.000 tracks lancadas por dia no Spotify - marketing e obrigatorio
- Estrategia cross-platform: TikTok -> Reels -> Shorts
- Playlists editoriais do Spotify: pitch 4+ semanas antes do lancamento
- Reels com gancho nos primeiros 1-3 segundos performam 3x melhor
- Colaboracoes entre artistas do mesmo porte geram crescimento mutuo de 20-40%
- Stories interativos (enquetes, caixinhas) aumentam alcance em 15-25%
- Pre-save campaigns aumentam chances de entrar no Release Radar em 60%`);


  // Artist profile
  sections.push(`## Perfil do Artista
- Nome: ${artist.name}
- Estilo: ${artist.style ?? "Nao definido"}
- Objetivos: ${artist.goals ?? "Nao definidos"}
- Bio: ${artist.bio ?? "Nao disponivel"}`);

  // Metrics per platform
  if (metrics.length > 0) {
    const metricsLines = metrics.map((m) => {
      const parts = [`### ${m.platform}`];
      if (m.followers != null) parts.push(`- Seguidores: ${m.followers.toLocaleString("pt-BR")}`);
      if (m.totalViews != null) parts.push(`- Visualizacoes totais: ${m.totalViews.toLocaleString("pt-BR")}`);
      if (m.engagementRate != null) parts.push(`- Taxa de engajamento: ${(m.engagementRate * 100).toFixed(2)}%`);
      if (m.totalLikes != null) parts.push(`- Total de likes: ${m.totalLikes.toLocaleString("pt-BR")}`);
      if (m.totalComments != null) parts.push(`- Total de comentarios: ${m.totalComments.toLocaleString("pt-BR")}`);
      return parts.join("\n");
    });

    sections.push(`## Metricas Atuais\n${metricsLines.join("\n\n")}`);
  }

  // Content performance
  if (content.length > 0) {
    const topContent = content
      .filter((c) => c.views != null || c.likes != null)
      .sort((a, b) => (b.views ?? b.likes ?? 0) - (a.views ?? a.likes ?? 0))
      .slice(0, 10);

    if (topContent.length > 0) {
      const contentLines = topContent.map((c, i) => {
        const stats = [];
        if (c.views != null) stats.push(`${c.views.toLocaleString("pt-BR")} views`);
        if (c.likes != null) stats.push(`${c.likes.toLocaleString("pt-BR")} likes`);
        if (c.comments != null) stats.push(`${c.comments.toLocaleString("pt-BR")} comments`);
        return `${i + 1}. "${c.title ?? "Sem titulo"}" (${c.contentType}) - ${stats.join(", ")}`;
      });

      sections.push(`## Top Conteudos Recentes\n${contentLines.join("\n")}`);
    }
  }

  // Audience demographics
  if (audience) {
    const audienceLines: string[] = [];

    if (audience.topCountries) {
      const countries = Object.entries(audience.topCountries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => `  - ${country}: ${count}`)
        .join("\n");
      audienceLines.push(`- Paises:\n${countries}`);
    }

    if (audience.genderSplit) {
      const genders = Object.entries(audience.genderSplit)
        .map(([gender, count]) => `  - ${gender}: ${count}`)
        .join("\n");
      audienceLines.push(`- Genero:\n${genders}`);
    }

    if (audience.ageRanges) {
      const ages = Object.entries(audience.ageRanges)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([range, count]) => `  - ${range}: ${count}`)
        .join("\n");
      audienceLines.push(`- Faixas etarias:\n${ages}`);
    }

    if (audienceLines.length > 0) {
      sections.push(`## Demografia do Publico\n${audienceLines.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}

export function buildMetricsSummaryFromSnapshots(
  snapshots: MetricsSnapshot[]
): MetricsSummary[] {
  return snapshots.map((s) => ({
    platform: s.platform,
    followers: s.followers,
    totalViews: s.totalViews,
    engagementRate: s.engagementRate,
    totalLikes: s.totalLikes,
    totalComments: s.totalComments,
  }));
}
