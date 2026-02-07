#!/bin/sh
set -e
/usr/bin/diana-db add-user -u admin -p admin
/usr/bin/diana-db grant-access -u admin -db test:3
/usr/bin/diana-db-server