import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { participantsAtom, groupsAtom, roomsAtom } from '../stores/dataStore'
import { Group } from '../types'

export interface Statistics {
  total: number
  checkedIn: number
  notCheckedIn: number
  checkInRate: string
  male: number
  female: number
  otherGender: number
  unknownGender: number
  maleCheckedIn: number
  femaleCheckedIn: number
  paid: number
  unpaid: number
  totalRoomCapacity: number
  currentOccupancy: number
  roomOccupancyRate: string
  dailyStats: { date: string; checkIns: number; checkOuts: number }[]
  topGroups: Group[]
  totalGroups: number
  totalRooms: number
}

export function useStatistics(): Statistics {
  const participants = useAtomValue(participantsAtom)
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)

  const stats = useMemo(() => {
    const total = participants.length
    const checkedIn = participants.filter((p) => p.checkIns.some((ci) => !ci.checkOutTime)).length
    const notCheckedIn = total - checkedIn

    // Gender breakdown
    const male = participants.filter((p) => p.gender?.toLowerCase() === 'male')
    const female = participants.filter((p) => p.gender?.toLowerCase() === 'female')
    const otherGender = participants.filter(
      (p) => p.gender && !['male', 'female'].includes(p.gender.toLowerCase())
    )
    const unknownGender = participants.filter((p) => !p.gender)

    const maleCheckedIn = male.filter((p) => p.checkIns.some((ci) => !ci.checkOutTime)).length
    const femaleCheckedIn = female.filter((p) => p.checkIns.some((ci) => !ci.checkOutTime)).length

    // Payment status
    const paid = participants.filter((p) => p.isPaid).length
    const unpaid = total - paid

    // Room occupancy
    const totalRoomCapacity = rooms.reduce((sum, r) => sum + r.maxCapacity, 0)
    const currentOccupancy = rooms.reduce((sum, r) => sum + r.currentOccupancy, 0)

    // Daily check-in stats (last 7 days)
    const dailyStats: { date: string; checkIns: number; checkOuts: number }[] = []
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      let checkIns = 0
      let checkOuts = 0

      participants.forEach((p) => {
        p.checkIns.forEach((ci) => {
          const checkInTime = new Date(ci.checkInTime)
          if (checkInTime >= startOfDay && checkInTime <= endOfDay) {
            checkIns++
          }
          if (ci.checkOutTime) {
            const checkOutTime = new Date(ci.checkOutTime)
            if (checkOutTime >= startOfDay && checkOutTime <= endOfDay) {
              checkOuts++
            }
          }
        })
      })

      dailyStats.push({
        date: new Intl.DateTimeFormat('ko-KR', {
          month: 'short',
          day: 'numeric'
        }).format(date),
        checkIns,
        checkOuts
      })
    }

    // Group stats - top 5 by participant count
    const topGroups = [...groups]
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 5)

    return {
      total,
      checkedIn,
      notCheckedIn,
      checkInRate: total > 0 ? ((checkedIn / total) * 100).toFixed(1) : '0',
      male: male.length,
      female: female.length,
      otherGender: otherGender.length,
      unknownGender: unknownGender.length,
      maleCheckedIn,
      femaleCheckedIn,
      paid,
      unpaid,
      totalRoomCapacity,
      currentOccupancy,
      roomOccupancyRate:
        totalRoomCapacity > 0 ? ((currentOccupancy / totalRoomCapacity) * 100).toFixed(1) : '0',
      dailyStats,
      topGroups,
      totalGroups: groups.length,
      totalRooms: rooms.length
    }
  }, [participants, groups, rooms])

  return stats
}
