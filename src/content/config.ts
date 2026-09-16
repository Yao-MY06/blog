import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
const projectsCollection = defineCollection({
	schema: z.object({
		name: z.string(),
		description: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		status: z.string(), // 进行中 / 规划中 / 已完成（兼容：开发中 / 已上线）
		url: z.string().optional().default(""),
		repo: z.string().optional().default(""),
		highlight: z.boolean().optional().default(false),
		cover: z.string().optional().default(""),
		order: z.number().optional().default(99),
		published: z.boolean().optional().default(true), // false = 草稿，生产构建不收录
	}),
});
export const collections = {
	posts: postsCollection,
	spec: specCollection,
	projects: projectsCollection,
};
