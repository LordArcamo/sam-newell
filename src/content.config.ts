import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tag: z.enum(['Buying', 'Selling', 'Investing', 'Framing', 'Family']),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
