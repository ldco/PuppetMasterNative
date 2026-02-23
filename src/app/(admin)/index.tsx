import { useMemo, useState } from 'react'
import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Icon } from '@/components/atoms/Icon'
import { Card } from '@/components/molecules/Card'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ListItem } from '@/components/molecules/ListItem'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { useAdmin } from '@/hooks/useAdmin'
import { useTheme } from '@/hooks/useTheme'

export default function AdminIndexScreen() {
  const router = useRouter()
  const { colors, tokens } = useTheme()
  const { sections } = useAdmin()
  const [query, setQuery] = useState('')

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    list: {
      gap: tokens.spacing.xs
    },
    searchRow: {
      marginBottom: tokens.spacing.xs
    }
  })

  const normalizedQuery = query.trim().toLowerCase()
  const filteredSections = useMemo(() => {
    if (!normalizedQuery) {
      return sections
    }

    return sections.filter((section) => {
      return (
        section.label.toLowerCase().includes(normalizedQuery) ||
        section.id.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [normalizedQuery, sections])

  const resolveRoute = (
    sectionId: string
  ): '/(admin)' | './users' | './roles' | './settings' => {
    if (sectionId === 'users') {
      return './users'
    }

    if (sectionId === 'roles') {
      return './roles'
    }

    if (sectionId === 'settings') {
      return './settings'
    }

    return '/(admin)'
  }

  const resolveIcon = (icon: string): ComponentProps<typeof Icon>['name'] => {
    return icon as ComponentProps<typeof Icon>['name']
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        subtitle="Enabled sections from config are listed below."
        title="Admin"
      />

      <Card>
        <View style={styles.searchRow}>
          <SearchBar onChangeText={setQuery} placeholder="Search admin sections" value={query} />
        </View>

        {filteredSections.length === 0 ? (
          <EmptyState
            ctaLabel={query ? 'Clear search' : undefined}
            description={
              query
                ? `No sections matched "${query}".`
                : 'No admin sections are available for your role.'
            }
            iconName="construct-outline"
            onCtaPress={query ? () => setQuery('') : undefined}
            title="No sections found"
          />
        ) : (
          <View style={styles.list}>
            {filteredSections.map((section, index) => (
              <ListItem
                key={section.id}
                leading={<Icon name={resolveIcon(section.icon)} tone="secondary" />}
                onPress={() => router.push(resolveRoute(section.id))}
                showDivider={index < filteredSections.length - 1}
                subtitle={section.group}
                title={section.label}
                trailing={<Icon name="chevron-forward" size={16} tone="secondary" />}
              />
            ))}
          </View>
        )}
      </Card>
    </View>
  )
}
