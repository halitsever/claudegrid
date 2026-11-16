#!/usr/bin/env bash
# Writes PKGBUILD and .SRCINFO for a release into a folder: update.sh <version> <sha256> <dir>
set -euo pipefail

version=$1
sha=$2
dest=$3
here=$(cd "$(dirname "$0")" && pwd)

sed -e "s/^pkgver=.*/pkgver=$version/" -e "s/^pkgrel=.*/pkgrel=1/" -e "s/^sha256sums=.*/sha256sums=('$sha')/" "$here/PKGBUILD" > "$dest/PKGBUILD"

# The same fields makepkg --printsrcinfo would print, so this runs on any distro.
{
  printf 'pkgbase = claudegrid\n'
  printf '\tpkgdesc = %s\n' "$(sed -n 's/^pkgdesc="\(.*\)"$/\1/p' "$here/PKGBUILD")"
  printf '\tpkgver = %s\n\tpkgrel = 1\n' "$version"
  printf '\turl = https://github.com/halitsever/claudegrid\n\tarch = any\n\tlicense = MIT\n\tmakedepends = npm\n\tdepends = nodejs>=20\n'
  sed -n "/^optdepends=(/,/^)/{s/^  '\(.*\)'$/\toptdepends = \1/p}" "$here/PKGBUILD"
  printf '\tnoextract = claudegrid-%s.tgz\n' "$version"
  printf '\tsource = claudegrid-%s.tgz::https://github.com/halitsever/claudegrid/releases/download/v%s/claudegrid.tgz\n' "$version" "$version"
  printf '\tsha256sums = %s\n\npkgname = claudegrid\n' "$sha"
} > "$dest/.SRCINFO"
