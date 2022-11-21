#include <stddef.h>     // NULL, size_t

#include "wasm.h"   // WASM_EXPORT, malloc, memcpy, realloc


typedef struct String
{
    size_t len;
    char* str;
} String;


typedef struct Variant
{
    size_t start;
    size_t end;
    struct String seq;
} Variant;


static String
concat(String lhs, String const rhs)
{
    lhs.str = realloc(lhs.str, lhs.len + rhs.len);
    if (NULL == lhs.str)
    {
        return (String) {0, NULL};
    } // if

    memcpy(lhs.str + lhs.len, rhs.str, rhs.len);
    lhs.len += rhs.len;
    return lhs;
} // concat


static String
patch(String const ref, size_t const n, Variant const vars[n])
{
    String obs = {0, NULL};

    size_t start = 0;
    for (size_t i = 0; i < n; ++i)
    {
        obs = concat(obs, (String) {vars[i].start - start, ref.str + start});
        obs = concat(obs, vars[i].seq);
        start = vars[i].end;
    } // for

    if (start < ref.len)
    {
        obs = concat(obs, (String) {ref.len - start, ref.str + start});
    } // if
    return obs;
} // patch


WASM_EXPORT("patch")
void*
patch_wrap(String const reference, size_t const n, Variant variants[n])
{
    console_log(13, "Hello, World!");

    String const obs = patch(reference, n, variants);
    String* const result = malloc(sizeof(*result));
    result->len = obs.len;
    result->str = obs.str;
    return result;
} // patch_wrap
