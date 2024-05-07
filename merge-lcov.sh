#!/bin/bash

files=`find ./  -name lcov.info`
args=""
for f in $files; do
  prefix=`echo $f | sed -e s/coverage.lcov.info// | sed -e s#^\./##`
	echo "fixing paths in $f"
	sed -i.bak "s#^SF\:src#SF\:${prefix}src#g" $f
	args="$args -a $f"
done