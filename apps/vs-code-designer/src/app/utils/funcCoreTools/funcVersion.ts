import { FuncVersion } from "@microsoft-logic-apps/utils";

export function tryParseFuncVersion(data: string | undefined): FuncVersion | undefined {
    if (data) {
        const majorVersion: string | undefined = tryGetMajorVersion(data);
        if (majorVersion) {
            return Object.values(FuncVersion).find(v => v === '~' + majorVersion);
        }
    }

    return undefined;
}

function tryGetMajorVersion(data: string): string | undefined {
    const match: RegExpMatchArray | null = data.match(/^[~v]?([0-9]+)/i);
    return match ? match[1] : undefined;
}