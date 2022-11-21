CC       = clang-15

CFLAGS   = -std=c99 -Wall -Wextra -Wpedantic -O3 \
           --target=wasm32 -nostdlib \
           -Wl,--no-entry, -Wl,--allow-undefined, -Wl,--import-memory, \
           -Wl,--export=__heap_base

test.wasm: test.c wasm.h Makefile
	$(CC) $(CFLAGS) -o $@ $<
