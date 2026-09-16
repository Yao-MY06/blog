// 从 Obsidian 库同步白名单文章到 src/content/posts/
// 用法：node scripts/sync-from-obsidian.mjs
// 白名单：scripts/publish-whitelist.json（只有列入白名单的文件才会被发布）
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "src", "content", "posts");
const MANIFEST = path.join(ROOT, "scripts", ".sync-manifest.json");

// 从 astro.config.mjs 读取 base，保证站内链接带正确前缀
function readBase() {
	const cfg = fs.readFileSync(path.join(ROOT, "astro.config.mjs"), "utf8");
	const m = cfg.match(/base:\s*"([^"]*)"/);
	return m ? m[1] : "/";
}
const BASE = readBase();

const whitelist = JSON.parse(
	fs.readFileSync(path.join(ROOT, "scripts", "publish-whitelist.json"), "utf8"),
);

// 文件名（不含扩展名）-> slug 的映射，用于把指向白名单内笔记的双链转成站内链接
const slugMap = new Map();
for (const p of whitelist.posts) {
	slugMap.set(path.basename(p.src, ".md").toLowerCase(), p.slug);
}

// 去掉正文首行的 H1（页面已渲染 frontmatter 标题，避免重复）
function stripLeadingH1(text) {
	return text.replace(/^\s*#[^\n]*\n+/, "");
}

// 剥离 Obsidian 管理元信息块：--- 包围且含 用途/更新频率/存放位置 的块
function stripPseudoFrontmatter(text) {
	const lines = text.split(/\r?\n/);
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim() === "---") {
			let j = i + 1;
			const block = [];
			while (j < lines.length && lines[j].trim() !== "---") {
				block.push(lines[j]);
				j++;
			}
			if (j < lines.length) {
				const isMeta = block.some((l) =>
					/^(用途|更新频率|存放位置)\s*[：:]/.test(l.trim()),
				);
				if (isMeta) {
					i = j; // 跳过整个块
					continue;
				}
			}
		}
		out.push(lines[i]);
	}
	return out.join("\n");
}

// [[目标|别名]] / [[../路径/目标]] / [[目标#锚点]] -> 站内链接或纯文本
function convertWikilinks(text) {
	return text.replace(
		/\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
		(_match, target, _anchor, alias) => {
			const name = path.basename(String(target).trim()).toLowerCase();
			const label = (alias || path.basename(String(target).trim())).trim();
			const slug = slugMap.get(name);
			return slug ? `[${label}](${BASE}/posts/${slug}/)` : label;
		},
	);
}

// ![[图片.png]] -> 标准 Markdown 图片（图片需先放入 public/images/）
function convertEmbeds(text) {
	return text.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_m, p) => {
		const name = path.basename(String(p).trim());
		return `![${name.replace(/\.[^.]+$/, "")}](${BASE}/images/${name})`;
	});
}

// 删除指向不存在文件的相对路径图片引用（库内附件缺失时的兜底）
function stripDeadImages(text, srcDir) {
	return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, target) => {
		if (/^(https?:)?\/\//.test(target) || target.startsWith("/")) return m; // 外链/站内绝对路径不动
		const abs = path.join(srcDir, decodeURIComponent(target));
		if (fs.existsSync(abs)) return m;
		console.warn(`[死图移除] ${path.basename(abs)}`);
		return alt ? `*（${alt}，配图待补）*` : "";
	});
}

function toFrontmatter(e) {
	const title = e.title || path.basename(e.src, ".md");
	const published = e.published || new Date().toISOString().slice(0, 10);
	return [
		"---",
		`title: ${JSON.stringify(title)}`,
		`published: ${published}`,
		`description: ${JSON.stringify(e.description || "")}`,
		`tags: ${JSON.stringify(e.tags || [])}`,
		`category: ${JSON.stringify(e.category || "")}`,
		"draft: false",
		"lang: 'zh_CN'",
		"---",
		"",
		"",
	].join("\n");
}

const generated = new Set();
for (const entry of whitelist.posts) {
	const srcPath = path.join(whitelist.vault, entry.src);
	if (!fs.existsSync(srcPath)) {
		console.warn(`[缺失] ${srcPath}`);
		continue;
	}
	let body = fs.readFileSync(srcPath, "utf8");
	body = stripLeadingH1(body);
	body = stripPseudoFrontmatter(body);
	body = stripDeadImages(body, path.dirname(srcPath));
	body = convertEmbeds(convertWikilinks(body));

	const out = toFrontmatter(entry) + body.trim() + "\n";
	const outPath = path.join(OUT_DIR, `${entry.slug}.md`);
	generated.add(outPath);

	if (fs.existsSync(outPath) && fs.readFileSync(outPath, "utf8") === out) {
		console.log(`[跳过] ${entry.slug}（无变化）`);
		continue;
	}
	fs.writeFileSync(outPath, out);
	console.log(`[写入] ${outPath}`);
}

// 幂等清理：上次生成、这次不在白名单里的文件会被删除
const prev = fs.existsSync(MANIFEST)
	? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
	: [];
for (const f of prev) {
	if (!generated.has(f) && fs.existsSync(f)) {
		fs.unlinkSync(f);
		console.log(`[清理] ${f}`);
	}
}
fs.writeFileSync(MANIFEST, JSON.stringify([...generated], null, 2));
console.log(`完成：${generated.size} 篇，BASE=${BASE}`);
