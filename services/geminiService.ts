
import { GoogleGenAI, Modality, Part, Type } from "@google/genai";
import { Character, ImageData, AspectRatio } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Highly specific, photography-based style prompts to ensure realism.
// Removed ambiguous terms like "digital painting" that could lead to non-photorealistic results.
const PHOTOREALISTIC_STYLES = [
    "Ultra-realistic DSLR photograph taken with an 85mm f/1.8 lens. The focus is tack-sharp on the subject's eyes, creating a creamy bokeh background. Lit with soft, natural light. A subtle, realistic film grain is visible.",
    "Cinematic film still from a modern Korean thriller. Shot with an anamorphic lens, creating subtle lens flare. The lighting is high-contrast and dramatic, with a slightly desaturated color palette, giving it an 8K hyper-detailed look.",
    "Authentic, candid street photography shot on Kodak Portra 400 film. Captures a genuine, unposed moment. The image has a distinct grainy texture and true-to-life colors characteristic of professional film stock.",
    "High-fashion editorial photograph. Lit with professional studio lighting, likely a large softbox, creating soft shadows and a clean look. Skin texture is perfect and natural. The color grading is sophisticated and deliberate.",
    "A raw, unposed documentary-style photo, captured with a 35mm lens using only available light. The focus is on capturing genuine emotion and telling a story through the environment. Appears unstaged and real.",
    "Hyper-detailed medium format photograph, as if taken with a Hasselblad camera. This results in incredible detail, texture, and tonal depth. The lighting is precisely controlled to sculpt the subject.",
    "Golden hour portrait. The lighting is warm, soft, and directional, creating long, gentle shadows and a beautiful glow on the subject. The depth of field is very shallow, isolating the character from the background.",
    "Atmospheric and moody photograph taken in a dimly lit interior setting. High ISO is used, resulting in noticeable but aesthetically pleasing film grain. Shallow depth of field isolates the subject from the surrounding darkness."
];


/**
 * Analyzes a Korean character description to extract structured data and an English translation for image generation.
 */
export const extractCharacterData = async (description: string): Promise<Omit<Character, 'id' | 'image'> & { englishDescription: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `다음 한국어 캐릭터 설명을 분석해주세요. 캐릭터의 이름, 나이, 성격, 대표 의상을 추출하고, 이미지 생성 AI를 위해 외형 묘사를 영어로 번역해주세요. 모든 정보를 JSON 형식으로 반환해야 합니다. 만약 특정 정보가 없다면 빈 문자열("")을 사용하세요. 영어 번역은 캐릭터의 시각적 특징에 초점을 맞춰 상세하게 작성해야 합니다.\n\n---\n캐릭터 설명:\n"${description}"\n---`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: "The character's name.",
                        },
                        age: {
                            type: Type.STRING,
                            description: "The character's age range (e.g., '20s', 'teenager').",
                        },
                        personality: {
                            type: Type.STRING,
                            description: "A brief description of the character's personality.",
                        },
                        outfit: {
                            type: Type.STRING,
                            description: "A description of the character's typical outfit.",
                        },
                        englishDescription: {
                            type: Type.STRING,
                            description: "A detailed English translation of the character's physical appearance, suitable for an image generation model.",
                        },
                    },
                    required: ["name", "age", "personality", "outfit", "englishDescription"],
                },
            },
        });
        
        const parsedJson = JSON.parse(response.text);

        if (!parsedJson.englishDescription) {
             throw new Error("English description was not generated.");
        }

        return parsedJson;

    } catch (e) {
        console.error("Error during character data extraction:", e);
        if (e instanceof Error) {
            throw new Error(`Character data extraction failed: ${e.message}`);
        }
        throw new Error("An unknown error occurred during character data extraction.");
    }
};

/**
 * Generates a single character portrait.
 */
const generateOneCharacterPortrait = async (prompt: string, aspectRatio: AspectRatio): Promise<ImageData> => {
    const finalPrompt = `
**TASK: Generate a photorealistic character portrait for a reference library.**

**CHARACTER DESCRIPTION:** "${prompt}"

**CRITICAL RULE: The character MUST be portrayed as ethnically Korean.** This is a non-negotiable, top-priority instruction.

---
**COMPOSITION & POSE (VERY STRICT):**
-   **Shot Type:** Bust shot (from the chest up), similar to a passport or ID photo.
-   **Pose:** The character MUST be facing directly forward, looking at the camera. The pose must be completely neutral and static. 
-   **Forbidden Poses:** No tilting of the head, no dynamic angles, and absolutely NO hands visible in the frame.
-   **Background:** Simple, non-distracting studio backdrop (solid light gray or off-white).
-   **Expression:** A completely neutral facial expression. No smiling or other emotions.
-   **Focus:** The focus must be entirely on the character.

---
**MANDATORY PHOTOGRAPHIC STYLE (NON-NEGOTIABLE):**
-   **Style:** Ultra-realistic, clean studio portrait.
-   **Lighting:** Bright, soft, and even lighting that illuminates the face clearly without creating harsh shadows. Think professional headshot lighting.
-   **Crucial Rule:** The final image MUST look like a real photograph. It must be indistinguishable from a photo taken with a high-end camera.
-   **Forbidden Effects:** Absolutely NO cinematic effects, no dramatic lighting, no lens flares, no heavy film grain, no vignettes, no color filters. The image should be plain and unstylized.

---
**FORBIDDEN ELEMENTS:**
-   The image MUST NOT contain any text, letters, words, numbers, watermarks, or typography.
`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1, // Generate one at a time
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("AI did not return any images. This could be due to a safety policy violation or a temporary service issue.");
        }
        
        const img = response.generatedImages[0];
        return {
            mimeType: 'image/jpeg',
            data: img.image.imageBytes,
        };

    } catch (e) {
        console.error("Error during single character portrait generation:", e);
        if (e instanceof Error) {
            throw new Error(`Single character generation failed: ${e.message}`);
        }
        throw new Error("An unknown error occurred during single character generation.");
    }
};


/**
 * Generates one or more character portraits by calling generateOneCharacterPortrait in parallel.
 */
export const generateCharacterPortraits = async (
    prompt: string,
    numberOfImages: number,
    aspectRatio: AspectRatio
): Promise<ImageData[]> => {
     try {
        const generationPromises: Promise<ImageData>[] = [];
        for (let i = 0; i < numberOfImages; i++) {
            generationPromises.push(generateOneCharacterPortrait(prompt, aspectRatio));
        }
        const results = await Promise.all(generationPromises);
        return results.filter(Boolean); // Filter out any failed results
    } catch (e) {
        console.error("Error during parallel character portrait generation:", e);
        if (e instanceof Error) {
            throw new Error(`Character generation failed: ${e.message}`);
        }
        throw new Error("An unknown error occurred during character generation.");
    }
};


/**
 * Edits an existing image based on a text prompt describing the modifications.
 */
export const editImage = async (
    baseImage: ImageData,
    modificationPrompt: string
): Promise<ImageData> => {
    const parts: Part[] = [];

    // Add the base image to be edited
    parts.push({
        inlineData: {
            mimeType: baseImage.mimeType,
            data: baseImage.data
        }
    });

    const finalPrompt = `
**AI Model Instructions: Intelligent Image Modification**

Your primary task is to intelligently modify the provided base image according to the user's request. You MUST produce a new, visibly changed image. Returning the original image is not an acceptable outcome.

---
**1. ANALYSIS OF BASE IMAGE**
-   **Analyze:** Scrutinize the provided input image to understand its subject, style, and composition.

---
**2. USER'S MODIFICATION REQUEST**
-   **Request:** "${modificationPrompt}"
-   **Action:** Execute this request on the base image. The change should be noticeable and directly address the user's prompt.

---
**3. GUIDELINES FOR MODIFICATION (Apply with care)**
-   **Character Identity:** Unless the prompt *specifically* requests a change to the character's face or core identity, you must preserve it with high fidelity. The character should still be recognizable as the same person.
-   **Style Consistency:** Maintain the original image's photorealistic style, lighting, and overall aesthetic. The edited image should blend seamlessly with the original.
-   **Avoid Unnecessary Alterations:** Focus only on the requested changes. Do not alter other parts of the image unless it's necessary to make the requested change look natural.

---
**4. CRITICAL OUTPUT REQUIREMENTS**
-   **Output:** A single, edited image that is clearly different from the original.
-   **Restriction:** The image must not contain any text, watermarks, or typography.
`;

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
        return {
            mimeType: imagePart.inlineData.mimeType,
            data: imagePart.inlineData.data,
        };
    }

    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    const errorMessage = textPart?.text || "AI failed to return an edited image.";
    throw new Error(`Image editing failed: ${errorMessage}`);
};


/**
 * Generates a single image based on a comprehensive set of instructions.
 * This version relies directly on reference images, removing the text-based analysis step
 * to improve character consistency.
 */
const generateOneImage = async (
    prompt: string,
    characterImages: ImageData[],
    addVariation: boolean,
    aspectRatio: AspectRatio
): Promise<ImageData> => {
    const parts: Part[] = [];

    // Add character images for the model to reference visually
    characterImages.forEach(img => {
        parts.push({
            inlineData: {
                mimeType: img.mimeType,
                data: img.data
            }
        });
    });

    // Pick a random photorealistic style and create the style prompt part
    const randomStyle = PHOTOREALISTIC_STYLES[Math.floor(Math.random() * PHOTOREALISTIC_STYLES.length)];
    const styleReferencePromptPart = `
---
**2. ART STYLE (MANDATORY & STRICT)**
**ACTION:** You MUST generate the image in the following photographic style. This is a critical instruction. The result MUST look like a real photograph, not an illustration, painting, or 3D render.
**STYLE:** ${randomStyle}
**ABSOLUTE RESTRICTIONS:** Avoid any and all artistic stylization. No illustrated features, no airbrushed skin, no cartoonish proportions, no painterly textures. The image must appear as if it was captured by a high-end camera.
`;

    const variationPrompt = addVariation ? "\n**VARIATION:** Create a different composition, pose, or camera angle from previous generations for this prompt." : "";

    const finalPrompt = `
**AI Model Instructions: Absolute Character Consistency & Photorealism**

Your three primary, non-negotiable goals are:
1.  **Character Consistency:** Perfectly replicate the person from the reference images.
2.  **Photorealism:** Generate an image that is indistinguishable from a real photograph.
3.  **Aspect Ratio:** The final image MUST have a ${aspectRatio === '16:9' ? 'wide, horizontal 16:9' : 'tall, vertical 9:16'} aspect ratio.

---
**1. CHARACTER DESIGN (Source: Reference Images ONLY)**
**ACTION:** This is your highest priority. Analyze the provided reference image(s) to understand the character's exact appearance. You MUST replicate their facial features, age, hair style and color, and overall look with extreme precision.
**CRITICAL ETHNICITY MANDATE:** The character in the reference images is ethnically Korean. Your generated image MUST maintain this Korean ethnicity. This is a strict, non-negotiable rule. The generated person must be undeniably the SAME PERSON as in the reference photos.
${styleReferencePromptPart}
---
**3. SCENE DESCRIPTION (Source: User's Text Prompt)**
**ACTION:** Place the character from section 1, rendered in the photographic style from section 2, into the scene described by the user's prompt below.
**USER PROMPT:**
"${prompt}"
${variationPrompt}
---
**4. TECHNICAL SPECIFICATIONS (NON-NEGOTIABLE)**
**ACTION:** Adhere strictly to the following technical requirements. This is the most important section.
-   **CRITICAL ASPECT RATIO:** The final image's aspect ratio MUST BE a ${aspectRatio === '16:9' ? 'wide, horizontal 16:9' : 'tall, vertical 9:16'}.
    -   **Valid examples for 16:9:** 1920x1080 pixels, 1280x720 pixels.
    -   **Valid examples for 9:16:** 1080x1920 pixels, 720x1280 pixels.
    -   **STRICTLY FORBIDDEN:** Do NOT generate a square (1:1, 1024x1024), ${aspectRatio === '16:9' ? 'vertical' : 'horizontal'}, or any other aspect ratio. The output MUST be ${aspectRatio === '16:9' ? 'horizontal' : 'vertical'}. Failure to follow this rule will result in an incorrect output.
-   **OUTPUT:** Generate ONE SINGLE, full-bleed image.
-   **CRITICAL RESTRICTION:** The generated image MUST NOT contain any text, letters, words, numbers, watermarks, or any form of typography. This is a strict rule.
- DO NOT use white borders or create multi-panel layouts.
`;
    
    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
        return {
            mimeType: imagePart.inlineData.mimeType,
            data: imagePart.inlineData.data,
        };
    }

    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    const errorMessage = textPart?.text || "AI failed to return an image for this scene.";
    throw new Error(`Image generation failed: ${errorMessage}`);
};


/**
 * Generates one or more images by calling generateOneImage in parallel.
 */
export const generateImages = async (
    prompt: string,
    characterImages: ImageData[],
    numberOfImages: number,
    aspectRatio: AspectRatio
): Promise<ImageData[]> => {
    const generationPromises: Promise<ImageData>[] = [];

    for (let i = 0; i < numberOfImages; i++) {
        generationPromises.push(
            generateOneImage(prompt, characterImages, i > 0, aspectRatio)
        );
    }
    
    const results = await Promise.all(generationPromises);
    return results.filter(Boolean); // Filter out any null/undefined results
};