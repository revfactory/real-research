#!/usr/bin/env python3
"""Generate all site images for Real Research using Gemini 3 Pro Image Preview."""

import os
import sys
from google import genai
from google.genai import types

client = genai.Client()
MODEL = "gemini-3-pro-image-preview"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

IMAGES = [
    {
        "name": "logo.png",
        "prompt": (
            "Design a minimal, modern app logo icon for 'Real Research' - an AI-powered research platform. "
            "The logo should combine a magnifying glass and neural network nodes in a clean geometric style. "
            "Use a gradient from deep indigo (#312E81) to violet (#7C3AED). "
            "White background, no text, flat design with subtle depth. "
            "Professional SaaS product quality, suitable for favicon and app icon."
        ),
        "ratio": "1:1",
        "size": "1K",
    },
    {
        "name": "hero-illustration.png",
        "prompt": (
            "Create a wide hero illustration for an AI research platform landing page. "
            "Show an abstract visualization of an AI-powered research pipeline: "
            "three glowing AI brain nodes (representing OpenAI, Anthropic, Gemini) connected by flowing data streams "
            "converging into a central research report document. "
            "Use a dark gradient background (#0F172A to #1E1B4B) with glowing indigo (#6366F1) and violet (#8B5CF6) accent lines. "
            "Include subtle floating data particles and document icons. "
            "Modern, futuristic, clean tech aesthetic. No text. No people."
        ),
        "ratio": "16:9",
        "size": "2K",
    },
    {
        "name": "feature-search.png",
        "prompt": (
            "Create a clean illustration representing 'Multi-AI Integrated Search'. "
            "Show three interconnected search windows or panels side by side, each with a distinct subtle color accent "
            "(green for OpenAI, orange for Anthropic, blue for Google), "
            "with search results flowing and merging into a unified stream in the center. "
            "Minimal flat design, light background (#F8FAFC), indigo (#6366F1) as primary accent. "
            "Abstract, geometric style. No text, no logos, no people."
        ),
        "ratio": "1:1",
        "size": "1K",
    },
    {
        "name": "feature-analysis.png",
        "prompt": (
            "Create a clean illustration representing '4-Phase Deep Analysis Pipeline'. "
            "Show four connected circular stages arranged in a flowing path, each stage slightly larger and more detailed: "
            "Stage 1 (magnifying glass icon), Stage 2 (shield/critique icon), Stage 3 (brain/network icon), Stage 4 (rocket/action icon). "
            "Connected by flowing lines with data particles moving along them. "
            "Minimal flat design, light background (#F8FAFC), violet (#7C3AED) as primary accent. "
            "Abstract, geometric style. No text, no people."
        ),
        "ratio": "1:1",
        "size": "1K",
    },
    {
        "name": "feature-factcheck.png",
        "prompt": (
            "Create a clean illustration representing 'Cross-Provider Fact Checking'. "
            "Show a central checkmark/verification badge surrounded by three orbiting verification nodes, "
            "with connecting lines showing cross-referencing between sources. "
            "Include subtle trust indicators (green checkmarks, amber warnings). "
            "Minimal flat design, light background (#F8FAFC), emerald green (#10B981) as primary accent. "
            "Abstract, geometric style. No text, no people."
        ),
        "ratio": "1:1",
        "size": "1K",
    },
    {
        "name": "empty-state.png",
        "prompt": (
            "Create a friendly, minimal empty state illustration for a research dashboard. "
            "Show a blank document or folder with a subtle magnifying glass and sparkle effects, "
            "suggesting 'start your first research'. "
            "Soft, muted colors with indigo (#6366F1) accent on a near-white (#F8FAFC) background. "
            "Gentle, inviting, not sad. Modern SaaS empty state style. No text, no people."
        ),
        "ratio": "1:1",
        "size": "1K",
    },
    {
        "name": "og-image.png",
        "prompt": (
            "Create a social media Open Graph image for 'Real Research' AI platform. "
            "Dark gradient background (#0F172A to #1E1B4B). "
            "Center: stylized text 'Real Research' in bold white modern sans-serif font. "
            "Below: smaller text 'AI-Powered Multi-Agent Research Pipeline' in light gray. "
            "Surrounding decorative elements: subtle glowing neural network nodes and connecting lines in indigo (#6366F1) and violet (#8B5CF6). "
            "Clean, professional, tech SaaS branding. Minimal."
        ),
        "ratio": "16:9",
        "size": "2K",
    },
]


def generate_image(image_config):
    """Generate a single image."""
    name = image_config["name"]
    output_path = os.path.join(OUTPUT_DIR, name)

    if os.path.exists(output_path):
        print(f"  ⏭ {name} already exists, skipping")
        return True

    print(f"  🎨 Generating {name} ({image_config['ratio']}, {image_config['size']})...")

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=image_config["prompt"],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=image_config["ratio"],
                    image_size=image_config["size"],
                ),
            ),
        )

        for part in response.parts:
            if image := part.as_image():
                image.save(output_path)
                print(f"  ✅ Saved {name}")
                return True
            elif part.text:
                print(f"  ℹ️  {part.text[:100]}")

        print(f"  ❌ No image returned for {name}")
        return False

    except Exception as e:
        print(f"  ❌ Error generating {name}: {e}")
        return False


def main():
    print(f"🚀 Generating {len(IMAGES)} site images for Real Research\n")
    print(f"Output directory: {OUTPUT_DIR}\n")

    success = 0
    failed = 0

    for i, img in enumerate(IMAGES, 1):
        print(f"[{i}/{len(IMAGES)}] {img['name']}")
        if generate_image(img):
            success += 1
        else:
            failed += 1
        print()

    print(f"{'='*40}")
    print(f"✅ Success: {success}/{len(IMAGES)}")
    if failed:
        print(f"❌ Failed: {failed}/{len(IMAGES)}")
    print(f"📁 Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
