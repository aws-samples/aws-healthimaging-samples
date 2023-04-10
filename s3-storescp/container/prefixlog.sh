#!/usr/bin/env bash
# helper script used to prefix log output from different supervisord-managed processes

# setup fd-3 to point to the original stdout
exec 3>&1
# setup fd-4 to point to the original stderr
exec 4>&2

# get the prefix from SUPERVISOR_PROCESS_NAME environement variable
printf -v PREFIX "%-10.10s" ${SUPERVISOR_PROCESS_NAME}

# reassign stdout and stderr to a preprocessed and redirected to the original stdout/stderr (3 and 4) we have create eralier
exec 1> >( perl -ne '$| = 1; print "'"${PREFIX}"' | $_"' >&3)
exec 2> >( perl -ne '$| = 1; print "'"${PREFIX}"' | $_"' >&4)

# from here on everything that outputs to stdout/stderr will be go through the perl script

exec "$@"
