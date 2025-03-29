#!/bin/bash

# this script will empty the main site's s3 bucket and deploy your built files.
# this will not build your files.

# delete files in the bucket
aws s3 rm s3://sbs-airplane-boarding-simulator --recursive

# move static files to the bucket
aws s3 cp dist/ s3://sbs-airplane-boarding-simulator --recursive
