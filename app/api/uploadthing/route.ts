import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "@/app/api/uploadthing/core";

// Export a POST request handler on /api/uploadthing
export const { POST } = createRouteHandler({
    router: ourFileRouter,
    config: {
        // Add any custom configuration options here
    },
});
