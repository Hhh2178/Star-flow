// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import VideoCard from "./video.vue";

const CardStub = defineComponent({
  template: "<section><slot name='actions' /><slot /></section>",
});
const ButtonStub = defineComponent({
  props: { disabled: Boolean, loading: Boolean },
  emits: ["click"],
  template: "<button :disabled='disabled' @click=\"$emit('click')\"><slot /></button>",
});

describe("video generation pricing guard", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("disables the real generate button and does not emit generate", async () => {
    const wrapper = mount(VideoCard, {
      props: {
        activeTrackIndex: 0,
        generationDisabled: true,
        currentTrack: { id: 1, videoList: [] } as any,
      },
      global: {
        mocks: { $t: (key: string) => key },
        provide: { episodesId: ref(1) },
        stubs: {
          "t-card": CardStub,
          "t-button": ButtonStub,
          "i-time": true,
          "i-check": true,
          "i-delete": true,
          "i-to-bottom": true,
          "i-play": true,
        },
      },
    });

    const button = wrapper.get("button");
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(wrapper.emitted("generate")).toBeUndefined();
  });
});
