/** Real playable videos only — skip GIFs and round video notes. */
export function isPlayableVideo(meta: {
  hasVideoAttr: boolean;
  roundMessage: boolean;
  animated: boolean;
}): boolean {
  return meta.hasVideoAttr && !meta.roundMessage && !meta.animated;
}
