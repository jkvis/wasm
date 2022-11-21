import { wasmInstance } from "./wasm.js";


const utf8decoder = new TextDecoder();
const utf8encoder = new TextEncoder();


class CString {
    constructor(str) {
        this.str = str;
        this.ptr = null;
    } // constructor

    wasm_destroy(wasm) {
        if (this.ptr === null) {
            return;
        } // if
        const env = wasm.env;
        const words = new Uint32Array(env.memory.buffer, this.ptr, 2);
        env.free(words[1]);
        env.free(this.ptr);
    } // wasm_destroy

    wasm_load(wasm, ptr) {
        this.ptr = ptr;
        const buffer = wasm.env.memory.buffer;
        const words = new Uint32Array(buffer, this.ptr, 2);
        this.str = utf8decoder.decode(new Uint8Array(buffer, words[1], words[0]));
        return this.str;
    } // wasm_load

    wasm_store(wasm) {
        const env = wasm.env;
        const buffer = env.memory.buffer;
        this.ptr = env.malloc(env.word_size * 2);
        if (this.ptr === null) {
            throw "malloc() failed";
        } // if
        const words = new Uint32Array(buffer, this.ptr, 2);
        const len = this.str.length;
        words[0] = len;
        words[1] = env.malloc(len);
        if (words[1] === null) {
            env.free(this.ptr);
            this.ptr = null;
            throw "malloc() failed";
        } // if
        utf8encoder.encodeInto(this.str, new Uint8Array(buffer, words[1], len));
        return this.ptr;
    } // wasm_store
} // CString


class CVariants {
    constructor(variants) {
        this.length = variants.length;
        this.variants = variants;
        this.ptr = null;
    } // constructor

    wasm_destroy(wasm) {
        if (this.ptr === null) {
            return;
        } // if
        const env = wasm.env;
        const buffer = env.memory.buffer;
        const size = 4 * this.variants.length;
        const words = new Uint32Array(buffer, this.ptr, size);
        this.variants.forEach((variant, idx) => {
            const offset = 4 * idx;
            env.free(words[offset + 3]);
        });
        env.free(this.ptr);
    } // wasm_destroy

    wasm_store(wasm) {
        const env = wasm.env;
        const buffer = env.memory.buffer;
        const size = 4 * this.variants.length;
        this.ptr = env.malloc(env.word_size * size);
        if (this.ptr === null) {
            throw "malloc() failed";
        } // if
        const words = new Uint32Array(buffer, this.ptr, size);
        this.variants.forEach((variant, idx) => {
            const offset = 4 * idx;
            const len = variant.sequence.length;
            words[offset] = variant.start;
            words[offset + 1] = variant.end;
            words[offset + 2] = len;
            words[offset + 3] = null;
            if (len > 0) {
                words[offset + 3] = env.malloc(len);
                if (words[offset + 3] === null) {
                    this.wasm_destroy(wasm);
                    throw "malloc() failed";
                } // if
                utf8encoder.encodeInto(variant.sequence, new Uint8Array(buffer, words[offset + 3], len));
            } // if
        });
        return this.ptr;
    } // wasm_store
} // CVariants


wasmInstance("./test.wasm").then(wasm => {
    console.log(wasm);

    const reference = new CString("ACGTCGATTCGCTAGCTTCGGGGGATAGATAGAGATATAGAGATA");
    const variants = new CVariants([
        {start: 3, end: 6, sequence: ""},
        {start: 8, end: 8, sequence: "TAAAA"},
        {start: 12, end: 13, sequence: "G"},
        {start: 20, end: 26, sequence: "CATCATCATCAT"},
    ]);

    const observed = new CString();
    observed.wasm_load(wasm, wasm.exports.patch(reference.wasm_store(wasm), variants.length, variants.wasm_store(wasm)));
    console.log("observed sequence:", observed.str);

    reference.wasm_destroy(wasm);
    variants.wasm_destroy(wasm);
    observed.wasm_destroy(wasm);
});
