// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { brand } from "@/assets/brand/brand";
import BrandIdentity from "./BrandIdentity.vue";

describe("Stars Flow brand registry", () => {
  it("exposes one product identity and renders an accessible mark", () => {
    expect(brand).toMatchObject({
      productName: "Stars Flow",
      chineseDescriptor: "AI 漫剧与短剧生产工作台",
      markAlt: "Stars Flow",
    });

    const wrapper = mount(BrandIdentity, {
      props: { showDescriptor: true },
    });

    expect(wrapper.text()).toContain("Stars Flow");
    expect(wrapper.text()).toContain("AI 漫剧与短剧生产工作台");
    expect(wrapper.get("img").attributes("alt")).toBe("Stars Flow");
  });
});
