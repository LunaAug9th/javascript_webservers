import http from "http";
import { VM } from "vm2";

const PORT = 82;
const TIMEOUT_MS = 60000; // 1분 제한

const server = http.createServer((req, res) => {
    try {
        // 요청된 URL에서 16진 코드 추출
        const hexCode = req.url.slice(1); // "/" 제거
        if (!hexCode) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ result: null, logs: ["Error: No code provided"] }));
        }

        let decodedCode;
        try {
            decodedCode = Buffer.from(hexCode, "hex").toString("utf-8");
        } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ result: null, logs: ["Error: Invalid hex encoding"] }));
        }

        // 로그 저장 배열
        const logs = [];

        // VM 실행
        let result = null;
        const vm = new VM({
            timeout: TIMEOUT_MS, // 1분 제한
            sandbox: {
                console: {
                    log: (...args) => logs.push(args.join(" ")), // 로그 저장
                },
            },
        });

        try {
            result = vm.run(decodedCode);
        } catch (vmError) {
            logs.push(`Error: ${vmError.message}`);
        }

        // 클라이언트 응답
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result, logs }));

        // ✅ VM 안전하게 초기화
        setTimeout(() => {
            try {
                Object.keys(vm.sandbox).forEach((key) => delete vm.sandbox[key]);
            } catch (vmError) {
                console.error("VM Cleanup Error:", vmError);
            }
        }, TIMEOUT_MS);
    } catch (serverError) {
        console.error("Server Error:", serverError);
    }
});

// 서버 실행
server.listen(PORT, () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
