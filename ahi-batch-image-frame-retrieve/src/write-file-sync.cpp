#include "ahi-retrieve/logger.h"
#include <fcntl.h>
#ifdef _WINDOWS
#include <io.h>
#else
#include <unistd.h>
#endif
#include <vector>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include "ahi-retrieve/write-file-sync.h"

using namespace AHIRetrieve;

void AHIRetrieve::writeFileSync(const char *filePath, const std::vector<unsigned char> &buffer)
{
    int fd = open(filePath, O_WRONLY | O_CREAT);
    if (fd == -1)
    {
        log(LOGLEVEL::ERRORZ, "Error %s creating file %s\n", strerror(errno), filePath);
        return;
    }

    int bytesWritten = 0;
    while (bytesWritten < buffer.size())
    {
        int result = write(fd, buffer.data() + bytesWritten, buffer.size() - bytesWritten);

        if (result == -1)
        {
            log(LOGLEVEL::ERRORZ, "Error %s writing file %s\n", strerror(errno), filePath);
            break;
        }
        bytesWritten += result;
    }

    close(fd);
}