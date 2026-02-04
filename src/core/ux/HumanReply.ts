import { formatReply, getBehaviorProfile, type BehaviorProfile } from "../behavior";
import { getUserStyle, setUserStyle, type UserStyle } from "./userStyle";

function mergeBehaviorWithStyle(
  behavior: BehaviorProfile,
  style: UserStyle,
): BehaviorProfile {
  const merged: BehaviorProfile = { ...behavior };
  if (style.response_detail) {
    merged.verbosity = style.response_detail;
  }
  if (style.formality) {
    merged.formality = style.formality;
  }
  if (style.emoji_preference === "none") {
    merged.emoji_level = 0;
  }
  return merged;
}

export async function polishReply(text: string): Promise<string> {
  const [behavior, style] = await Promise.all([getBehaviorProfile(), getUserStyle()]);
  const merged = mergeBehaviorWithStyle(behavior, style);
  return formatReply(text, merged);
}

export async function syncStyleFromBehavior(): Promise<void> {
  const behavior = await getBehaviorProfile();
  const desired: Partial<UserStyle> = {
    response_detail: behavior.verbosity,
    formality: behavior.formality,
    emoji_preference: behavior.emoji_level > 0 ? "light" : "none",
  };
  await setUserStyle(desired);
}
