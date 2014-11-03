#!/bin/sh

# This script removes then re-adds the ios project because for some reason
# when removing then re-adding plugins, the XCode Project can fail to properly
# point to them, leading to mysterious file-not-found-by-compiler errors.
# 
# Note that this script's containing directory should be located at:
#     <project-dir>/.scripts/

echo "WARNING: You will need to re-get the provision profile for this app"'!'

REDOWNLOAD_PLUGINS=''
REPLACE_XCODE_PROJECT=1

getAppProjectDir() {
	basename "$( ls platforms/ios | grep xcodeproj )"
}

while [[ $1 ]]; do
	case "$1" in
		( -p | --redownload-plugins )
			REDOWNLOAD_PLUGINS=1
			;;
		( -X | --dont-replace-xcode-project )
			REPLACE_XCODE_PROJECT=''
			;;
		( * )
			# ... eh.
			;;
	esac

	shift
done

DB_APP_KEY=g4ewyei04fhfrpp
DB_APP_SECRET=hgj5p7g5qqpzfvc
APP_PROJECT_DIR="$( getAppProjectDir )"
APP_NAME="${APP_PROJECT_DIR%.*}"

if [[ ! ( "$DB_APP_KEY" && "$DB_APP_SECRET" ) ]]; then
	echo "ERROR: Please fill in DB_APP_KEY and DB_APP_SECRET in this script."
fi

if [[ "$REPLACE_XCODE_PROJECT" ]]; then
	[[ -d platforms/ios ]] && ionic platform rm ios
	ionic platform add ios
fi

if [[ "$REDOWNLOAD_PLUGINS" ]]; then
	echo "Re-downloading plugins from git."
	
	cordova plugin remove 'org.joedski.phonegap.dropbox.sync'
	cordova plugin add 'https://github.com/joedski/phonegap-dropbox-sync' \
	    --variable 'DB_APP_KEY='"$DB_APP_KEY" \
	    --variable 'DB_APP_SECRET='"$DB_APP_SECRET"

	# Cordova doesn't do automatic dependencies like Plugman does.
	cordova plugin remove 'org.rentzsch.jrswizzle'
	cordova plugin add 'https://github.com/joedski/phonegap-jrswizzle'
fi

# Always trying to remove just to keep things to a normal state.

plugman uninstall --platform ios --project "platforms/ios" \
	--plugin 'org.rentzsch.jrswizzle'

plugman uninstall --platform ios --project "platforms/ios" \
	--plugin 'org.joedski.phonegap.dropbox.sync'

plugman install --platform ios --project "platforms/ios" \
	--plugin './plugins/org.joedski.phonegap.dropbox.sync' \
    --variable 'DB_APP_KEY='"$DB_APP_KEY" \
    --variable 'DB_APP_SECRET='"$DB_APP_SECRET"

# Re-adding handled by dependency checking.
# plugman install --platform ios --project "platforms/ios" \
# 	--plugin './plugins/org.rentzsch.jrswizzle'

echo "replacing cordova's pbxproj file..."
cat '.scripts/pbxproj-templates/dropbox-project.pbxproj' \
| sed '/{{APP_NAME}}/ s//'"$APP_NAME"'/g' \
> 'platforms/ios/'"$APP_PROJECT_DIR"'/project.pbxproj'
