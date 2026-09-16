// biome-ignore lint/suspicious/noShadowRestrictedNames: <toString from mdast-util-to-string>
import { toString } from "mdast-util-to-string";

export function remarkReadingTime() {
	return (tree, { data }) => {
		// CJK 感知的字数统计：中文按字符计数，英文按单词计数
		const text = toString(tree);
		const cjkChars = (
			text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []
		).length;
		const latinWords = (
			text
				.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, " ")
				.match(/\S+/g) || []
		).length;
		data.astro.frontmatter.words = cjkChars + latinWords;
		// 中文阅读速度约 400 字/分钟，英文约 200 词/分钟
		data.astro.frontmatter.minutes = Math.max(
			1,
			Math.round(cjkChars / 400 + latinWords / 200),
		);
	};
}
