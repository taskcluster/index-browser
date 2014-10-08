

upload:
	aws s3 sync ./ s3://status.taskcluster.net --exclude ".git/*"  --region us-west-1

serve:
	python -m SimpleHTTPServer 7400
